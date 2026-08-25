CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_code text NOT NULL,
  year integer NOT NULL,
  entitled_days numeric NOT NULL DEFAULT 0,
  used_days numeric NOT NULL DEFAULT 0,
  converted_days numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_code, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_balances TO authenticated;
GRANT ALL ON public.leave_balances TO service_role;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their leave balances"
ON public.leave_balances FOR ALL TO authenticated
USING (public.owns_company(company_id))
WITH CHECK (public.owns_company(company_id));

CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_code text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  reason text,
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their leave requests"
ON public.leave_requests FOR ALL TO authenticated
USING (public.owns_company(company_id))
WITH CHECK (public.owns_company(company_id));

CREATE INDEX idx_leave_balances_company ON public.leave_balances (company_id, year);
CREATE INDEX idx_leave_requests_company ON public.leave_requests (company_id, start_date DESC);
CREATE INDEX idx_leave_requests_employee ON public.leave_requests (employee_id, start_date DESC);

CREATE TRIGGER update_leave_balances_updated_at
BEFORE UPDATE ON public.leave_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();