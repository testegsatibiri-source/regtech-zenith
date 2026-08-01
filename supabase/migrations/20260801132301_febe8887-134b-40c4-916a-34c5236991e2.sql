CREATE TABLE public.uada_score_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_version integer NOT NULL,
  dimension text NOT NULL,
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  weight numeric(4,3) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  overall numeric(5,2) NOT NULL CHECK (overall >= 0 AND overall <= 100),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uada_score_reports_snapshot_dimension_key UNIQUE (snapshot_version, dimension)
);

GRANT SELECT ON public.uada_score_reports TO authenticated;
GRANT ALL ON public.uada_score_reports TO service_role;

ALTER TABLE public.uada_score_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform roles can read architecture scores"
  ON public.uada_score_reports
  FOR SELECT
  TO authenticated
  USING (public.is_uada_reader());

CREATE INDEX idx_uada_score_reports_snapshot ON public.uada_score_reports (snapshot_version DESC, dimension);

CREATE TRIGGER update_uada_score_reports_updated_at
  BEFORE UPDATE ON public.uada_score_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();