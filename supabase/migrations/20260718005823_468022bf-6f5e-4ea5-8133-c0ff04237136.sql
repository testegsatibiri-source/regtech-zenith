
-- =========================================================================
-- H1: Indexes
-- =========================================================================
CREATE INDEX IF NOT EXISTS companies_owner_idx ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS branches_company_idx ON public.branches(company_id);
CREATE INDEX IF NOT EXISTS employees_company_status_idx ON public.employees(company_id, status);
CREATE INDEX IF NOT EXISTS employees_branch_idx ON public.employees(branch_id);
CREATE INDEX IF NOT EXISTS employees_country_meta_gin ON public.employees USING gin (country_metadata);
CREATE INDEX IF NOT EXISTS payroll_runs_company_period_idx ON public.payroll_runs(company_id, period_year DESC, period_month DESC);
CREATE INDEX IF NOT EXISTS payroll_items_run_idx ON public.payroll_items(run_id);
CREATE INDEX IF NOT EXISTS payroll_items_company_idx ON public.payroll_items(company_id);
CREATE INDEX IF NOT EXISTS payroll_items_employee_idx ON public.payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS compliance_findings_company_idx ON public.compliance_findings(company_id, severity, passed);
CREATE INDEX IF NOT EXISTS compliance_findings_run_idx ON public.compliance_findings(run_id);
CREATE INDEX IF NOT EXISTS compliance_obligations_company_due_idx ON public.compliance_obligations(company_id, due_date, status);
CREATE INDEX IF NOT EXISTS compliance_obligations_category_idx ON public.compliance_obligations(company_id, category);

-- =========================================================================
-- H1: Unique constraints
-- =========================================================================
ALTER TABLE public.payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_company_period_unique;
ALTER TABLE public.payroll_runs
  ADD CONSTRAINT payroll_runs_company_period_unique UNIQUE (company_id, period_year, period_month);

ALTER TABLE public.compliance_obligations
  DROP CONSTRAINT IF EXISTS compliance_obligations_company_code_period_unique;
ALTER TABLE public.compliance_obligations
  ADD CONSTRAINT compliance_obligations_company_code_period_unique UNIQUE (company_id, code, period_label);

-- =========================================================================
-- H1: Domain CHECKs
-- =========================================================================
ALTER TABLE public.compliance_findings
  DROP CONSTRAINT IF EXISTS compliance_findings_severity_check;
ALTER TABLE public.compliance_findings
  ADD CONSTRAINT compliance_findings_severity_check
  CHECK (severity IN ('critical','high','medium','info'));

ALTER TABLE public.compliance_obligations
  DROP CONSTRAINT IF EXISTS compliance_obligations_status_check;
ALTER TABLE public.compliance_obligations
  ADD CONSTRAINT compliance_obligations_status_check
  CHECK (status IN ('pending','completed','dismissed'));

ALTER TABLE public.payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_status_check;
ALTER TABLE public.payroll_runs
  ADD CONSTRAINT payroll_runs_status_check
  CHECK (status IN ('draft','finalized','archived'));

-- =========================================================================
-- H1: Hashes / ruleset versioning
-- =========================================================================
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS snapshot_hash text,
  ADD COLUMN IF NOT EXISTS ruleset_hash text,
  ADD COLUMN IF NOT EXISTS ruleset_version text;

ALTER TABLE public.compliance_findings
  ADD COLUMN IF NOT EXISTS ruleset_version text;

-- =========================================================================
-- H1: Add 'auditor' enum value (must be committed before use)
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'auditor') THEN
    ALTER TYPE public.app_role ADD VALUE 'auditor';
  END IF;
END $$;

-- =========================================================================
-- H1: is_auditor() — casts via text to avoid pre-commit enum ref error
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_auditor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'auditor'::text::public.app_role);
$$;

-- =========================================================================
-- H1: Refined RLS
-- =========================================================================
DROP POLICY IF EXISTS "Owners manage own companies" ON public.companies;
CREATE POLICY "companies_select_owner_or_auditor" ON public.companies
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_auditor());
CREATE POLICY "companies_insert_owner" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "companies_update_owner" ON public.companies
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "companies_delete_owner" ON public.companies
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'branches','employees','payroll_runs','payroll_items',
    'compliance_findings','compliance_obligations','employment_contracts'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.owns_company(company_id) OR public.is_auditor())',
      t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.owns_company(company_id))',
      t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id))',
      t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.owns_company(company_id))',
      t || '_delete', t);
  END LOOP;
END $$;

-- =========================================================================
-- H3: api_keys + api_usage
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  hashed_key text NOT NULL UNIQUE,
  prefix text NOT NULL,
  label text,
  scopes text[] NOT NULL DEFAULT ARRAY['calculate']::text[],
  monthly_quota integer NOT NULL DEFAULT 10000,
  allowed_origins text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_select_owner" ON public.api_keys
  FOR SELECT TO authenticated
  USING (public.owns_company(company_id) OR public.is_auditor());
CREATE POLICY "api_keys_insert_owner" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_company(company_id));
CREATE POLICY "api_keys_update_owner" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));
CREATE POLICY "api_keys_delete_owner" ON public.api_keys
  FOR DELETE TO authenticated
  USING (public.owns_company(company_id));
CREATE INDEX IF NOT EXISTS api_keys_company_idx ON public.api_keys(company_id);
CREATE INDEX IF NOT EXISTS api_keys_hashed_idx ON public.api_keys(hashed_key);

CREATE TABLE IF NOT EXISTS public.api_usage (
  id bigserial PRIMARY KEY,
  key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  endpoint text NOT NULL,
  status_code integer NOT NULL,
  latency_ms integer NOT NULL,
  ip inet
);
GRANT SELECT ON public.api_usage TO authenticated;
GRANT ALL ON public.api_usage TO service_role;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_usage_select_owner" ON public.api_usage
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.api_keys k
    WHERE k.id = api_usage.key_id AND public.owns_company(k.company_id)
  ));
CREATE INDEX IF NOT EXISTS api_usage_key_ts_idx ON public.api_usage(key_id, ts DESC);

-- =========================================================================
-- H4: metrics_events
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.metrics_events (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  value_ms integer,
  trace_id text,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT ALL ON public.metrics_events TO service_role;
ALTER TABLE public.metrics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_events_select_auditor" ON public.metrics_events
  FOR SELECT TO authenticated
  USING (public.is_auditor());
CREATE INDEX IF NOT EXISTS metrics_events_name_ts_idx ON public.metrics_events(name, ts DESC);

-- =========================================================================
-- H4: score cache column
-- =========================================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS score_cache jsonb;

-- =========================================================================
-- Quota helper
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_api_quota(_key_id uuid, _monthly_quota integer)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT count(*) FROM public.api_usage
    WHERE key_id = _key_id
      AND ts >= date_trunc('month', now())
  ) < _monthly_quota;
$$;
