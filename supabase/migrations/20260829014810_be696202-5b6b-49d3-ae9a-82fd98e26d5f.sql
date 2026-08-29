CREATE TABLE public.employee_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  legal_basis text NOT NULL DEFAULT 'consent',
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  evidence_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, purpose)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_consents TO authenticated;
GRANT ALL ON public.employee_consents TO service_role;
ALTER TABLE public.employee_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage employee consents" ON public.employee_consents
  FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
CREATE INDEX idx_employee_consents_employee ON public.employee_consents(employee_id);
CREATE INDEX idx_employee_consents_company ON public.employee_consents(company_id);
CREATE TRIGGER update_employee_consents_updated_at BEFORE UPDATE ON public.employee_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.personal_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  purpose text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.personal_data_access_log TO authenticated;
GRANT ALL ON public.personal_data_access_log TO service_role;
ALTER TABLE public.personal_data_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read access log" ON public.personal_data_access_log
  FOR SELECT TO authenticated USING (public.owns_company(company_id));
CREATE POLICY "Owners append access log" ON public.personal_data_access_log
  FOR INSERT TO authenticated WITH CHECK (public.owns_company(company_id) AND actor_id = auth.uid());
CREATE INDEX idx_pdal_company_created ON public.personal_data_access_log(company_id, created_at DESC);
CREATE INDEX idx_pdal_employee ON public.personal_data_access_log(employee_id);

CREATE TABLE public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category text NOT NULL,
  retention_months integer NOT NULL,
  legal_reference text,
  purge_action text NOT NULL DEFAULT 'anonymize',
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_retention_policies TO authenticated;
GRANT ALL ON public.data_retention_policies TO service_role;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage retention policies" ON public.data_retention_policies
  FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();