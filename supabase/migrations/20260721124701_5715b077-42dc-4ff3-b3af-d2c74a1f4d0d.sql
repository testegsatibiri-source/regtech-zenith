
-- H11 Consolidation migration

-- 1. Platform feature gates (distinct from per-country pack_feature_flags)
CREATE TABLE public.platform_feature_gates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gate TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('preview','staging','production')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gate, environment)
);
GRANT SELECT ON public.platform_feature_gates TO authenticated;
GRANT ALL ON public.platform_feature_gates TO service_role;
ALTER TABLE public.platform_feature_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform staff read gates" ON public.platform_feature_gates FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());
CREATE POLICY "admin manage gates" ON public.platform_feature_gates FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- 2. Compatibility reports (versioned engine + matrix history)
CREATE TABLE public.compatibility_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_country TEXT NOT NULL,
  pack_version TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  matrix_version TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  environment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_compat_reports_country_created ON public.compatibility_reports (pack_country, created_at DESC);
GRANT SELECT ON public.compatibility_reports TO authenticated;
GRANT ALL ON public.compatibility_reports TO service_role;
ALTER TABLE public.compatibility_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform staff read compat reports" ON public.compatibility_reports FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());

-- 3. Runtime boot reports (Readiness history)
CREATE TABLE public.runtime_boot_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready BOOLEAN NOT NULL,
  environment TEXT,
  runtime_version TEXT NOT NULL,
  sdk_version TEXT NOT NULL,
  report JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_boot_reports_ts ON public.runtime_boot_reports (ts DESC);
GRANT SELECT ON public.runtime_boot_reports TO authenticated;
GRANT ALL ON public.runtime_boot_reports TO service_role;
ALTER TABLE public.runtime_boot_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform staff read boot reports" ON public.runtime_boot_reports FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());

-- 4. Index on platform_audit_log (action lookups for signature rejection dashboards)
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_action_at ON public.platform_audit_log (action, at DESC);

-- 5. Seed platform feature gates (safe defaults: preview on, prod off)
INSERT INTO public.platform_feature_gates (gate, environment, enabled, description) VALUES
  ('registry_enabled','preview',true,'Load packs from pack_registry alongside bootstrap.ts.'),
  ('registry_enabled','staging',true,'Load packs from pack_registry alongside bootstrap.ts.'),
  ('registry_enabled','production',false,'Load packs from pack_registry alongside bootstrap.ts.'),
  ('compatibility_matrix','preview',true,'Enforce Version Compatibility Matrix on boot and install.'),
  ('compatibility_matrix','staging',true,'Enforce Version Compatibility Matrix on boot and install.'),
  ('compatibility_matrix','production',false,'Enforce Version Compatibility Matrix on boot and install.'),
  ('signature_enforce','preview',false,'Enforce PACK_SIG on install; false=warn only.'),
  ('signature_enforce','staging',false,'Enforce PACK_SIG on install; false=warn only.'),
  ('signature_enforce','production',false,'Enforce PACK_SIG on install; false=warn only.'),
  ('config_service','preview',true,'Route provider config resolution through ConfigService.'),
  ('config_service','staging',true,'Route provider config resolution through ConfigService.'),
  ('config_service','production',true,'Route provider config resolution through ConfigService.'),
  ('bootstrap_compare','preview',true,'H11.1 shadow mode: compare bootstrap vs registry, emit divergence events.'),
  ('bootstrap_compare','staging',true,'H11.1 shadow mode: compare bootstrap vs registry, emit divergence events.'),
  ('bootstrap_compare','production',true,'H11.1 shadow mode: compare bootstrap vs registry, emit divergence events.')
ON CONFLICT (gate, environment) DO NOTHING;
