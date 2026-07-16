CREATE TABLE public.compliance_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL DEFAULT 'ID',
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tax',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  base_legal TEXT,
  due_date DATE NOT NULL,
  period_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_obligations TO authenticated;
GRANT ALL ON public.compliance_obligations TO service_role;

ALTER TABLE public.compliance_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage obligations"
  ON public.compliance_obligations
  FOR ALL
  TO authenticated
  USING (public.owns_company(company_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_company(company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_obligations_company_due ON public.compliance_obligations(company_id, due_date);

CREATE TRIGGER trg_obligations_updated
  BEFORE UPDATE ON public.compliance_obligations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
