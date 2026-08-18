CREATE TABLE public.statutory_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  form_code text NOT NULL,
  form_title text NOT NULL,
  period_year integer NOT NULL,
  period_month integer,
  run_id uuid REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'generated',
  ruleset_version text NOT NULL,
  pack_version text NOT NULL,
  artifact_format text NOT NULL,
  artifact_filename text NOT NULL,
  artifact_checksum text NOT NULL,
  artifact_content text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz,
  submission_reference text,
  submission_notes text,
  amends_filing_id uuid REFERENCES public.statutory_filings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT statutory_filings_status_chk CHECK (status IN ('draft','generated','submitted','stale','amended')),
  CONSTRAINT statutory_filings_month_chk CHECK (period_month IS NULL OR (period_month BETWEEN 1 AND 12))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.statutory_filings TO authenticated;
GRANT ALL ON public.statutory_filings TO service_role;

ALTER TABLE public.statutory_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their filings"
ON public.statutory_filings FOR SELECT TO authenticated
USING (public.owns_company(company_id));

CREATE POLICY "Owners can create their filings"
ON public.statutory_filings FOR INSERT TO authenticated
WITH CHECK (public.owns_company(company_id));

CREATE POLICY "Owners can update their filings"
ON public.statutory_filings FOR UPDATE TO authenticated
USING (public.owns_company(company_id))
WITH CHECK (public.owns_company(company_id));

CREATE POLICY "Owners can delete their filings"
ON public.statutory_filings FOR DELETE TO authenticated
USING (public.owns_company(company_id));

CREATE INDEX statutory_filings_company_period_idx
  ON public.statutory_filings (company_id, period_year DESC, period_month DESC);

CREATE TRIGGER update_statutory_filings_updated_at
BEFORE UPDATE ON public.statutory_filings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DEBT-023: a submitted filing is legally immutable. Corrections go through an
-- amended return, never through rewriting the original artifact.
CREATE OR REPLACE FUNCTION public.enforce_filing_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.submitted_at IS NOT NULL THEN
    IF NEW.artifact_content IS DISTINCT FROM OLD.artifact_content
       OR NEW.artifact_checksum IS DISTINCT FROM OLD.artifact_checksum
       OR NEW.ruleset_version IS DISTINCT FROM OLD.ruleset_version
       OR NEW.period_year IS DISTINCT FROM OLD.period_year
       OR NEW.period_month IS DISTINCT FROM OLD.period_month THEN
      RAISE EXCEPTION 'Submitted filings are immutable; issue an amended filing instead';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER statutory_filings_immutability
BEFORE UPDATE ON public.statutory_filings
FOR EACH ROW EXECUTE FUNCTION public.enforce_filing_immutability();