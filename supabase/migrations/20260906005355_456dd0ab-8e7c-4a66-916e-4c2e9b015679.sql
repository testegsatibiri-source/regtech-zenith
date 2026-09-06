CREATE TABLE public.separation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name text NOT NULL,
  reason_code text NOT NULL,
  contract_type text NOT NULL,
  join_date date NOT NULL,
  separation_date date NOT NULL,
  statutory_minimum numeric NOT NULL DEFAULT 0,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  inputs_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculation_trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  legal_basis_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ruleset_version text NOT NULL,
  ruleset_effective_date date NOT NULL,
  calculation_status text NOT NULL DEFAULT 'computed',
  blocked_code text,
  completeness_status text NOT NULL DEFAULT 'complete',
  missing_inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  compliance_violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_legal_classification boolean NOT NULL DEFAULT false,
  renewal_blocked boolean NOT NULL DEFAULT false,
  regulatory_status text NOT NULL DEFAULT 'time_bounded',
  calculation_hash text NOT NULL,
  calculated_by uuid REFERENCES auth.users(id),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Append-only para o aplicativo: sem DELETE para authenticated.
GRANT SELECT, INSERT, UPDATE ON public.separation_cases TO authenticated;
GRANT ALL ON public.separation_cases TO service_role;

ALTER TABLE public.separation_cases ENABLE ROW LEVEL SECURITY;

-- RLS endurecida: escopo da empresa (owns_company) + permissão funcional específica.
CREATE POLICY "separation_cases_select" ON public.separation_cases
  FOR SELECT TO authenticated
  USING (public.owns_company(company_id) AND public.has_capability(auth.uid(), 'separation.view'));

CREATE POLICY "separation_cases_insert" ON public.separation_cases
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_company(company_id) AND public.has_capability(auth.uid(), 'separation.calculate'));

CREATE POLICY "separation_cases_update" ON public.separation_cases
  FOR UPDATE TO authenticated
  USING (public.owns_company(company_id) AND public.has_capability(auth.uid(), 'separation.approve'))
  WITH CHECK (public.owns_company(company_id) AND public.has_capability(auth.uid(), 'separation.approve'));

CREATE INDEX idx_separation_cases_company ON public.separation_cases(company_id, separation_date DESC);

CREATE TRIGGER update_separation_cases_updated_at BEFORE UPDATE ON public.separation_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Snapshot imutável: depois de aprovado, a memória de cálculo não muda mais.
CREATE OR REPLACE FUNCTION public.enforce_separation_case_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.approved_at IS NOT NULL THEN
    IF NEW.components IS DISTINCT FROM OLD.components
       OR NEW.inputs_snapshot IS DISTINCT FROM OLD.inputs_snapshot
       OR NEW.calculation_trace IS DISTINCT FROM OLD.calculation_trace
       OR NEW.legal_basis_snapshot IS DISTINCT FROM OLD.legal_basis_snapshot
       OR NEW.statutory_minimum IS DISTINCT FROM OLD.statutory_minimum
       OR NEW.ruleset_version IS DISTINCT FROM OLD.ruleset_version
       OR NEW.calculation_hash IS DISTINCT FROM OLD.calculation_hash
       OR NEW.reason_code IS DISTINCT FROM OLD.reason_code
       OR NEW.separation_date IS DISTINCT FROM OLD.separation_date THEN
      RAISE EXCEPTION 'Approved separation cases are immutable; issue a new calculation instead';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER separation_cases_immutability BEFORE UPDATE ON public.separation_cases
  FOR EACH ROW EXECUTE FUNCTION public.enforce_separation_case_immutability();

-- Matriz de capacidades funcionais do módulo de rescisões (segregação de funções):
-- admin: tudo; manager: visualiza e calcula; auditor: só visualiza; viewer: nada.
INSERT INTO public.role_capabilities (role, capability, scope) VALUES
  ('admin',   'separation.view',      'global'),
  ('admin',   'separation.calculate', 'global'),
  ('admin',   'separation.approve',   'global'),
  ('admin',   'separation.finalize',  'global'),
  ('manager', 'separation.view',      'global'),
  ('manager', 'separation.calculate', 'global'),
  ('auditor', 'separation.view',      'global');