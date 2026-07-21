
-- =========================================================
-- Helper functions (SECURITY DEFINER, look up roles safely)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'platform_admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_platform_operator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'platform_operator'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_platform_auditor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'platform_auditor'::public.app_role);
$$;

-- =========================================================
-- 2. country_cto_scopes
-- =========================================================
CREATE TABLE public.country_cto_scopes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (user_id, country_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.country_cto_scopes TO authenticated;
GRANT ALL ON public.country_cto_scopes TO service_role;
ALTER TABLE public.country_cto_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform admins can manage cto scopes"
  ON public.country_cto_scopes FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "platform staff can read cto scopes"
  ON public.country_cto_scopes FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.is_platform_operator()
    OR public.is_platform_auditor()
    OR user_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.is_country_cto(_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'country_cto'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.country_cto_scopes
    WHERE user_id = auth.uid() AND country_code = _code);
$$;

-- =========================================================
-- 3. Enums for parameters + installations
-- =========================================================
CREATE TYPE public.regulatory_parameter_status AS ENUM (
  'draft','review','approved','active','superseded','archived'
);

CREATE TYPE public.pack_installation_status AS ENUM (
  'draft','candidate','approved','released','deprecated','archived','rolled_back'
);

CREATE TYPE public.pack_install_source AS ENUM (
  'manual','pipeline','rollback','marketplace'
);

CREATE TYPE public.pack_flag_environment AS ENUM (
  'preview','production','all'
);

-- =========================================================
-- 4. regulatory_parameters
-- =========================================================
CREATE TABLE public.regulatory_parameters (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  parameter_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_from date,
  effective_to date,
  version integer NOT NULL DEFAULT 1,
  status public.regulatory_parameter_status NOT NULL DEFAULT 'draft',
  author uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  activated_by uuid REFERENCES auth.users(id),
  activated_at timestamptz,
  checksum text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, parameter_key, version)
);

CREATE INDEX regulatory_parameters_country_status_idx
  ON public.regulatory_parameters (country_code, status);
CREATE INDEX regulatory_parameters_country_key_idx
  ON public.regulatory_parameters (country_code, parameter_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.regulatory_parameters TO authenticated;
GRANT ALL ON public.regulatory_parameters TO service_role;
ALTER TABLE public.regulatory_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform staff can read regulatory parameters"
  ON public.regulatory_parameters FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.is_platform_operator()
    OR public.is_platform_auditor()
    OR public.is_country_cto(country_code)
  );

CREATE POLICY "platform admin can insert regulatory parameters"
  ON public.regulatory_parameters FOR INSERT
  WITH CHECK (public.is_platform_admin() OR public.is_country_cto(country_code));

CREATE POLICY "platform admin can update regulatory parameters"
  ON public.regulatory_parameters FOR UPDATE
  USING (public.is_platform_admin() OR public.is_country_cto(country_code))
  WITH CHECK (public.is_platform_admin() OR public.is_country_cto(country_code));

CREATE POLICY "platform admin can delete regulatory parameters"
  ON public.regulatory_parameters FOR DELETE
  USING (public.is_platform_admin());

-- Trigger: only one "active" row per (country_code, parameter_key)
CREATE OR REPLACE FUNCTION public.enforce_one_active_regulatory_parameter()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF EXISTS (
      SELECT 1 FROM public.regulatory_parameters
      WHERE country_code = NEW.country_code
        AND parameter_key = NEW.parameter_key
        AND status = 'active'
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'Only one active regulatory_parameter per (country_code, parameter_key)';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_one_active_regulatory_parameter
  BEFORE INSERT OR UPDATE ON public.regulatory_parameters
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_active_regulatory_parameter();

CREATE TRIGGER trg_regulatory_parameters_updated_at
  BEFORE UPDATE ON public.regulatory_parameters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. pack_installations
-- =========================================================
CREATE TABLE public.pack_installations (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  pack_version text NOT NULL,
  status public.pack_installation_status NOT NULL DEFAULT 'draft',
  installed_from public.pack_install_source NOT NULL DEFAULT 'manual',
  installed_core_version text,
  installed_sdk_version text,
  runtime_version text,
  manifest_checksum text,
  manifest_signature text,
  installed_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  released_by uuid REFERENCES auth.users(id),
  released_at timestamptz,
  deprecated_by uuid REFERENCES auth.users(id),
  deprecated_at timestamptz,
  archived_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,
  rollback_of uuid REFERENCES public.pack_installations(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pack_installations_country_status_idx
  ON public.pack_installations (country_code, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pack_installations TO authenticated;
GRANT ALL ON public.pack_installations TO service_role;
ALTER TABLE public.pack_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform staff can read pack installations"
  ON public.pack_installations FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.is_platform_operator()
    OR public.is_platform_auditor()
    OR public.is_country_cto(country_code)
  );

CREATE POLICY "platform admin can insert pack installations"
  ON public.pack_installations FOR INSERT
  WITH CHECK (public.is_platform_admin() OR public.is_country_cto(country_code));

CREATE POLICY "platform admin can update pack installations"
  ON public.pack_installations FOR UPDATE
  USING (public.is_platform_admin() OR public.is_country_cto(country_code))
  WITH CHECK (public.is_platform_admin() OR public.is_country_cto(country_code));

CREATE POLICY "platform admin can delete pack installations"
  ON public.pack_installations FOR DELETE
  USING (public.is_platform_admin());

CREATE TRIGGER trg_pack_installations_updated_at
  BEFORE UPDATE ON public.pack_installations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 6. pack_feature_flags
-- =========================================================
CREATE TABLE public.pack_feature_flags (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  flag text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 100
    CHECK (rollout_percentage BETWEEN 0 AND 100),
  environment public.pack_flag_environment NOT NULL DEFAULT 'all',
  effective_from timestamptz,
  effective_to timestamptz,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, flag, environment)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pack_feature_flags TO authenticated;
GRANT ALL ON public.pack_feature_flags TO service_role;
ALTER TABLE public.pack_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform staff can read pack flags"
  ON public.pack_feature_flags FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.is_platform_operator()
    OR public.is_platform_auditor()
    OR public.is_country_cto(country_code)
  );

CREATE POLICY "platform admin can write pack flags"
  ON public.pack_feature_flags FOR ALL
  USING (public.is_platform_admin() OR public.is_country_cto(country_code))
  WITH CHECK (public.is_platform_admin() OR public.is_country_cto(country_code));

CREATE TRIGGER trg_pack_feature_flags_updated_at
  BEFORE UPDATE ON public.pack_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 7. platform_audit_log (append-only)
-- =========================================================
CREATE TABLE public.platform_audit_log (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target text,
  country_code text,
  component text,
  old_value jsonb,
  new_value jsonb,
  correlation_id uuid,
  request_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_audit_log_country_at_idx
  ON public.platform_audit_log (country_code, at DESC);
CREATE INDEX platform_audit_log_correlation_idx
  ON public.platform_audit_log (correlation_id);

GRANT SELECT, INSERT ON public.platform_audit_log TO authenticated;
GRANT ALL ON public.platform_audit_log TO service_role;
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform staff can read audit log"
  ON public.platform_audit_log FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.is_platform_auditor()
    OR public.is_platform_operator()
    OR (country_code IS NOT NULL AND public.is_country_cto(country_code))
  );

CREATE POLICY "platform staff can insert audit log"
  ON public.platform_audit_log FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_platform_operator()
    OR (country_code IS NOT NULL AND public.is_country_cto(country_code))
  );
