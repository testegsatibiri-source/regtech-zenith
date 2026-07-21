
-- ============================================================================
-- Sprint H10 — Hardening: IAM, Marketplace, Signing, Observability
-- ============================================================================

-- Prereqs: pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. IAM: capabilities-first
-- ----------------------------------------------------------------------------

CREATE TABLE public.role_capabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role public.app_role NOT NULL,
  capability TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global', -- 'global' | 'country'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, capability)
);
GRANT SELECT ON public.role_capabilities TO authenticated;
GRANT ALL ON public.role_capabilities TO service_role;
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read role_capabilities"
  ON public.role_capabilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform_admin manages role_capabilities"
  ON public.role_capabilities FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Seed default capability map
INSERT INTO public.role_capabilities (role, capability, scope) VALUES
  -- platform_admin: everything
  ('platform_admin', 'dashboard.view',     'global'),
  ('platform_admin', 'pack.view',          'global'),
  ('platform_admin', 'pack.install',       'global'),
  ('platform_admin', 'pack.uninstall',     'global'),
  ('platform_admin', 'pack.rollback',      'global'),
  ('platform_admin', 'pack.health',        'global'),
  ('platform_admin', 'pack.sign',          'global'),
  ('platform_admin', 'pack.countersign',   'global'),
  ('platform_admin', 'release.view',       'global'),
  ('platform_admin', 'release.transition', 'global'),
  ('platform_admin', 'release.approve',    'global'),
  ('platform_admin', 'release.publish',    'global'),
  ('platform_admin', 'release.rollback',   'global'),
  ('platform_admin', 'parameters.view',    'global'),
  ('platform_admin', 'parameters.import',  'global'),
  ('platform_admin', 'parameters.export',  'global'),
  ('platform_admin', 'flags.view',         'global'),
  ('platform_admin', 'flags.edit',         'global'),
  ('platform_admin', 'audit.view',         'global'),
  ('platform_admin', 'iam.manage',         'global'),
  ('platform_admin', 'observability.view', 'global'),
  ('platform_admin', 'incidents.manage',   'global'),
  -- platform_operator
  ('platform_operator', 'dashboard.view',     'global'),
  ('platform_operator', 'pack.view',          'global'),
  ('platform_operator', 'pack.health',        'global'),
  ('platform_operator', 'release.view',       'global'),
  ('platform_operator', 'parameters.view',    'global'),
  ('platform_operator', 'parameters.export',  'global'),
  ('platform_operator', 'flags.view',         'global'),
  ('platform_operator', 'observability.view', 'global'),
  ('platform_operator', 'incidents.manage',   'global'),
  -- platform_auditor
  ('platform_auditor', 'dashboard.view', 'global'),
  ('platform_auditor', 'pack.view',      'global'),
  ('platform_auditor', 'release.view',   'global'),
  ('platform_auditor', 'parameters.view','global'),
  ('platform_auditor', 'flags.view',     'global'),
  ('platform_auditor', 'audit.view',     'global'),
  ('platform_auditor', 'observability.view', 'global'),
  -- country_cto (scoped to country)
  ('country_cto', 'dashboard.view',     'country'),
  ('country_cto', 'pack.view',          'country'),
  ('country_cto', 'pack.install',       'country'),
  ('country_cto', 'pack.rollback',      'country'),
  ('country_cto', 'pack.sign',          'country'),
  ('country_cto', 'release.view',       'country'),
  ('country_cto', 'release.transition', 'country'),
  ('country_cto', 'release.approve',    'country'),
  ('country_cto', 'parameters.view',    'country'),
  ('country_cto', 'parameters.import',  'country'),
  ('country_cto', 'flags.view',         'country'),
  ('country_cto', 'flags.edit',         'country');

CREATE TABLE public.platform_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  country_code TEXT,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_invitations_email_idx ON public.platform_invitations(email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_invitations TO authenticated;
GRANT ALL ON public.platform_invitations TO service_role;
ALTER TABLE public.platform_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_admin manages invitations"
  ON public.platform_invitations FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER platform_invitations_updated_at
  BEFORE UPDATE ON public.platform_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. Marketplace: registry + lifecycle (8 states)
-- ----------------------------------------------------------------------------

CREATE TYPE public.pack_state AS ENUM (
  'experimental','draft','review','approved','published','deprecated','yanked','archived'
);

CREATE TABLE public.pack_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  pack_version TEXT NOT NULL,
  interface_version TEXT NOT NULL,
  requires_core TEXT NOT NULL,
  publisher TEXT NOT NULL,
  state public.pack_state NOT NULL DEFAULT 'experimental',
  manifest JSONB NOT NULL,
  checksum TEXT NOT NULL,
  signatures JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{signer, algo, sig, capability, ts}]
  compatibility_report JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, pack_version)
);
CREATE INDEX pack_registry_state_idx ON public.pack_registry(state);
CREATE INDEX pack_registry_country_idx ON public.pack_registry(country_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pack_registry TO authenticated;
GRANT ALL ON public.pack_registry TO service_role;
ALTER TABLE public.pack_registry ENABLE ROW LEVEL SECURITY;
-- Read: staff sees all except experimental (only creator + admin)
CREATE POLICY "staff read non-experimental packs"
  ON public.pack_registry FOR SELECT TO authenticated
  USING (
    state <> 'experimental'::public.pack_state
    AND (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor()
         OR public.is_country_cto(country_code))
  );
CREATE POLICY "creator or admin read experimental"
  ON public.pack_registry FOR SELECT TO authenticated
  USING (
    state = 'experimental'::public.pack_state
    AND (created_by = auth.uid() OR public.is_platform_admin())
  );
CREATE POLICY "admin or scoped cto writes packs"
  ON public.pack_registry FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_country_cto(country_code))
  WITH CHECK (public.is_platform_admin() OR public.is_country_cto(country_code));
CREATE TRIGGER pack_registry_updated_at
  BEFORE UPDATE ON public.pack_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pack_lifecycle_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.pack_registry(id) ON DELETE CASCADE,
  from_state public.pack_state,
  to_state public.pack_state NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pack_lifecycle_events_pack_idx ON public.pack_lifecycle_events(pack_id);
GRANT SELECT, INSERT ON public.pack_lifecycle_events TO authenticated;
GRANT ALL ON public.pack_lifecycle_events TO service_role;
ALTER TABLE public.pack_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads lifecycle events"
  ON public.pack_lifecycle_events FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());
CREATE POLICY "admin or cto writes lifecycle events"
  ON public.pack_lifecycle_events FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.pack_registry pr
    WHERE pr.id = pack_id AND public.is_country_cto(pr.country_code)
  ));

CREATE TABLE public.trust_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL UNIQUE,
  required_signatures INT NOT NULL DEFAULT 1,
  required_capabilities TEXT[] NOT NULL DEFAULT ARRAY['pack.sign'],
  distinct_signers BOOLEAN NOT NULL DEFAULT false,
  allow_experimental BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trust_policies TO authenticated;
GRANT ALL ON public.trust_policies TO service_role;
ALTER TABLE public.trust_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read trust_policies"
  ON public.trust_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin writes trust_policies"
  ON public.trust_policies FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
INSERT INTO public.trust_policies (environment, required_signatures, required_capabilities, distinct_signers, allow_experimental) VALUES
  ('preview',    1, ARRAY['pack.sign'], false, true),
  ('staging',    1, ARRAY['pack.sign'], false, false),
  ('production', 2, ARRAY['pack.sign','pack.countersign'], true, false);

CREATE TABLE public.pack_signing_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  publisher TEXT NOT NULL,
  public_key TEXT NOT NULL,          -- base64 Ed25519 public key
  algo TEXT NOT NULL DEFAULT 'ed25519',
  capabilities TEXT[] NOT NULL DEFAULT ARRAY['pack.sign'],  -- pack.sign | pack.countersign
  provider TEXT NOT NULL DEFAULT 'db',                       -- db | kms | hsm (future)
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (publisher, public_key)
);
GRANT SELECT ON public.pack_signing_keys TO authenticated;
GRANT ALL ON public.pack_signing_keys TO service_role;
ALTER TABLE public.pack_signing_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read signing keys"
  ON public.pack_signing_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages signing keys"
  ON public.pack_signing_keys FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 3. Observability: layers, incidents, alerts
-- ----------------------------------------------------------------------------

-- Extend metrics_events with layer taxonomy
ALTER TABLE public.metrics_events
  ADD COLUMN IF NOT EXISTS layer TEXT NOT NULL DEFAULT 'api';
CREATE INDEX IF NOT EXISTS metrics_events_layer_ts_idx ON public.metrics_events(layer, ts DESC);

CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('P1','P2','P3','P4')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','mitigated','resolved','closed')),
  layer TEXT NOT NULL DEFAULT 'runtime',   -- runtime|api|database|packs|business
  country_code TEXT,
  description TEXT,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX incidents_status_idx ON public.incidents(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages incidents"
  ON public.incidents FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor())
  WITH CHECK (public.is_platform_admin() OR public.is_platform_operator());
CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.postmortems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  cause TEXT NOT NULL,
  resolution TEXT NOT NULL,
  prevention TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postmortems TO authenticated;
GRANT ALL ON public.postmortems TO service_role;
ALTER TABLE public.postmortems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages postmortems"
  ON public.postmortems FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor())
  WITH CHECK (public.is_platform_admin() OR public.is_platform_operator());
CREATE TRIGGER postmortems_updated_at
  BEFORE UPDATE ON public.postmortems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  layer TEXT NOT NULL,
  metric TEXT NOT NULL,
  comparator TEXT NOT NULL CHECK (comparator IN ('>','<','>=','<=','==','!=')),
  threshold NUMERIC NOT NULL,
  window_seconds INT NOT NULL DEFAULT 300,
  severity TEXT NOT NULL DEFAULT 'P3' CHECK (severity IN ('P1','P2','P3','P4')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_rules TO authenticated;
GRANT ALL ON public.alert_rules TO service_role;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads alert_rules"
  ON public.alert_rules FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());
CREATE POLICY "admin or operator writes alert_rules"
  ON public.alert_rules FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator())
  WITH CHECK (public.is_platform_admin() OR public.is_platform_operator());
CREATE TRIGGER alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.alert_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('slack','email','webhook','sms','whatsapp','pagerduty')),
  target TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_notifications TO authenticated;
GRANT ALL ON public.alert_notifications TO service_role;
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages alert_notifications"
  ON public.alert_notifications FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator())
  WITH CHECK (public.is_platform_admin() OR public.is_platform_operator());

CREATE TABLE public.alert_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  after_seconds INT NOT NULL,
  notification_id UUID NOT NULL REFERENCES public.alert_notifications(id) ON DELETE CASCADE,
  UNIQUE (rule_id, step_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_escalations TO authenticated;
GRANT ALL ON public.alert_escalations TO service_role;
ALTER TABLE public.alert_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages alert_escalations"
  ON public.alert_escalations FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator())
  WITH CHECK (public.is_platform_admin() OR public.is_platform_operator());

CREATE TABLE public.alert_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  observed_value NUMERIC,
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.alert_incidents TO authenticated;
GRANT ALL ON public.alert_incidents TO service_role;
ALTER TABLE public.alert_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads alert_incidents"
  ON public.alert_incidents FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());
CREATE POLICY "operator writes alert_incidents"
  ON public.alert_incidents FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator())
  WITH CHECK (public.is_platform_admin() OR public.is_platform_operator());

CREATE TABLE public.metrics_export_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exported_from TIMESTAMPTZ NOT NULL,
  exported_to TIMESTAMPTZ NOT NULL,
  rows_exported BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  sink TEXT NOT NULL DEFAULT 'file',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.metrics_export_log TO authenticated;
GRANT ALL ON public.metrics_export_log TO service_role;
ALTER TABLE public.metrics_export_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff reads metrics_export_log"
  ON public.metrics_export_log FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());
CREATE POLICY "operator writes metrics_export_log"
  ON public.metrics_export_log FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR public.is_platform_operator());

-- ----------------------------------------------------------------------------
-- 4. Capability resolver function (used by PermissionService server-side)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_capability(_user_id UUID, _capability TEXT, _country_code TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_capabilities rc ON rc.role = ur.role
    WHERE ur.user_id = _user_id
      AND rc.capability = _capability
      AND (
        rc.scope = 'global'
        OR (rc.scope = 'country' AND _country_code IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.country_cto_scopes ccs
              WHERE ccs.user_id = _user_id AND ccs.country_code = _country_code
            ))
      )
  );
$$;
