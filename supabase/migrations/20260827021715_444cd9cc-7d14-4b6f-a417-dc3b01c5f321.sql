CREATE TABLE public.employee_dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text NOT NULL DEFAULT 'child',
  birth_date date,
  is_pwd boolean NOT NULL DEFAULT false,
  is_student boolean NOT NULL DEFAULT false,
  is_qualified_dependent boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_dependents TO authenticated;
GRANT ALL ON public.employee_dependents TO service_role;
ALTER TABLE public.employee_dependents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage employee dependents" ON public.employee_dependents
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

CREATE INDEX idx_employee_dependents_employee ON public.employee_dependents(employee_id);
CREATE INDEX idx_employee_dependents_company ON public.employee_dependents(company_id);
CREATE TRIGGER update_employee_dependents_updated_at BEFORE UPDATE ON public.employee_dependents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.employee_job_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  position text,
  department text,
  base_salary numeric NOT NULL DEFAULT 0,
  employment_type text,
  effective_date date NOT NULL,
  change_reason text NOT NULL DEFAULT 'hire',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_job_history TO authenticated;
GRANT ALL ON public.employee_job_history TO service_role;
ALTER TABLE public.employee_job_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage employee job history" ON public.employee_job_history
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

CREATE INDEX idx_employee_job_history_employee ON public.employee_job_history(employee_id, effective_date DESC);
CREATE INDEX idx_employee_job_history_company ON public.employee_job_history(company_id);
CREATE TRIGGER update_employee_job_history_updated_at BEFORE UPDATE ON public.employee_job_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();