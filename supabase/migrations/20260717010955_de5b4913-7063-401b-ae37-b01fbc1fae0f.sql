
CREATE TABLE public.employment_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('PKWT','PKWTT')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','expired','terminated')),
  position TEXT,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  probation_end_date DATE,
  signed_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  clauses JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX employment_contracts_company_idx ON public.employment_contracts(company_id);
CREATE INDEX employment_contracts_employee_idx ON public.employment_contracts(employee_id);
CREATE INDEX employment_contracts_end_date_idx ON public.employment_contracts(end_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_contracts TO authenticated;
GRANT ALL ON public.employment_contracts TO service_role;

ALTER TABLE public.employment_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their employment_contracts"
ON public.employment_contracts FOR ALL
TO authenticated
USING (public.owns_company(company_id))
WITH CHECK (public.owns_company(company_id));

CREATE TRIGGER update_employment_contracts_updated_at
BEFORE UPDATE ON public.employment_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
