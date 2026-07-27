-- H13.5 UADA hardening

-- 1. Snapshots: manifest + graph schema version + expanded promotion states
ALTER TABLE public.uada_snapshots
  ADD COLUMN IF NOT EXISTS graph_schema_version text NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS manifest jsonb;

-- CHECK: manifest may only exist when the snapshot is/was promoted
ALTER TABLE public.uada_snapshots
  DROP CONSTRAINT IF EXISTS uada_snapshots_manifest_state_chk;
ALTER TABLE public.uada_snapshots
  ADD CONSTRAINT uada_snapshots_manifest_state_chk
  CHECK (manifest IS NULL OR state IN ('active','archived','deprecated'));

-- Trigger: once set, manifest is frozen
CREATE OR REPLACE FUNCTION public.prevent_manifest_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.manifest IS NOT NULL AND NEW.manifest IS DISTINCT FROM OLD.manifest THEN
    RAISE EXCEPTION 'uada_snapshots.manifest is immutable once set (snapshot %)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_manifest_mutation ON public.uada_snapshots;
CREATE TRIGGER trg_prevent_manifest_mutation
BEFORE UPDATE ON public.uada_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.prevent_manifest_mutation();

-- Expanded promotion_state check
ALTER TABLE public.uada_snapshots
  DROP CONSTRAINT IF EXISTS uada_snapshots_promotion_state_chk;
ALTER TABLE public.uada_snapshots
  ADD CONSTRAINT uada_snapshots_promotion_state_chk
  CHECK (promotion_state IN (
    'building','validating','promoting','active','archived','deprecated',
    'failed','cancel_requested','cancelling','cancelled'
  ));

-- 2. Index runs: coverage_detail + cancellation state
ALTER TABLE public.uada_index_runs
  ADD COLUMN IF NOT EXISTS coverage_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cancel_state text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.uada_index_runs
  DROP CONSTRAINT IF EXISTS uada_index_runs_cancel_state_chk;
ALTER TABLE public.uada_index_runs
  ADD CONSTRAINT uada_index_runs_cancel_state_chk
  CHECK (cancel_state IN ('none','cancel_requested','cancelling','cancelled'));

-- 3. Benchmark definitions (curated query set)
CREATE TABLE IF NOT EXISTS public.uada_search_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  query text NOT NULL,
  expected_paths text[] NOT NULL DEFAULT '{}',
  category text NOT NULL,
  benchmark_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.uada_search_benchmarks TO authenticated;
GRANT ALL ON public.uada_search_benchmarks TO service_role;

ALTER TABLE public.uada_search_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uada_bench_read" ON public.uada_search_benchmarks;
CREATE POLICY "uada_bench_read"
ON public.uada_search_benchmarks
FOR SELECT
TO authenticated
USING (public.is_uada_reader());

DROP POLICY IF EXISTS "uada_bench_write" ON public.uada_search_benchmarks;
CREATE POLICY "uada_bench_write"
ON public.uada_search_benchmarks
FOR ALL
TO authenticated
USING (public.is_uada_writer())
WITH CHECK (public.is_uada_writer());

DROP TRIGGER IF EXISTS trg_uada_bench_updated ON public.uada_search_benchmarks;
CREATE TRIGGER trg_uada_bench_updated
BEFORE UPDATE ON public.uada_search_benchmarks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Benchmark results (per snapshot, per query)
CREATE TABLE IF NOT EXISTS public.uada_benchmark_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.uada_snapshots(id) ON DELETE CASCADE,
  benchmark_id uuid NOT NULL REFERENCES public.uada_search_benchmarks(id) ON DELETE CASCADE,
  benchmark_version text NOT NULL,
  precision_at_5 numeric,
  recall_at_5 numeric,
  hit boolean NOT NULL DEFAULT false,
  latency_ms integer,
  returned_paths text[] NOT NULL DEFAULT '{}',
  ran_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, benchmark_id, benchmark_version)
);

CREATE INDEX IF NOT EXISTS uada_benchmark_results_snapshot_idx
  ON public.uada_benchmark_results(snapshot_id);

GRANT SELECT ON public.uada_benchmark_results TO authenticated;
GRANT ALL ON public.uada_benchmark_results TO service_role;

ALTER TABLE public.uada_benchmark_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uada_bench_res_read" ON public.uada_benchmark_results;
CREATE POLICY "uada_bench_res_read"
ON public.uada_benchmark_results
FOR SELECT
TO authenticated
USING (public.is_uada_reader());

DROP POLICY IF EXISTS "uada_bench_res_write" ON public.uada_benchmark_results;
CREATE POLICY "uada_bench_res_write"
ON public.uada_benchmark_results
FOR ALL
TO authenticated
USING (public.is_uada_writer())
WITH CHECK (public.is_uada_writer());