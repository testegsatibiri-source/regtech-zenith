-- H14 — ContextAssembler + Inference infra

-- 1. Edge confidence & source (for Impact Engine)
ALTER TABLE public.uada_graph_edges
  ADD COLUMN IF NOT EXISTS confidence numeric NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ast'
    CHECK (source IN ('ast','sql','docs','manifest','inferred'));

-- 2. Benchmark regression view
CREATE INDEX IF NOT EXISTS idx_uada_benchmark_results_bench_snap
  ON public.uada_benchmark_results (benchmark_id, snapshot_id);

CREATE OR REPLACE VIEW public.uada_benchmark_regression AS
WITH ranked AS (
  SELECT
    r.benchmark_id,
    r.snapshot_id,
    s.version AS snapshot_version,
    r.precision_at_5,
    r.recall_at_5,
    r.hit,
    r.latency_ms,
    r.ran_at,
    LAG(r.precision_at_5) OVER (
      PARTITION BY r.benchmark_id ORDER BY s.version
    ) AS prev_precision_at_5,
    LAG(s.version) OVER (
      PARTITION BY r.benchmark_id ORDER BY s.version
    ) AS prev_snapshot_version
  FROM public.uada_benchmark_results r
  JOIN public.uada_snapshots s ON s.id = r.snapshot_id
)
SELECT
  benchmark_id,
  snapshot_id,
  snapshot_version,
  prev_snapshot_version,
  precision_at_5,
  prev_precision_at_5,
  (precision_at_5 - COALESCE(prev_precision_at_5, precision_at_5)) AS delta_precision,
  CASE
    WHEN prev_precision_at_5 IS NULL THEN 'baseline'
    WHEN (precision_at_5 - prev_precision_at_5) < -0.05 THEN 'regression'
    WHEN (precision_at_5 - prev_precision_at_5) > 0.05 THEN 'improvement'
    ELSE 'stable'
  END AS status,
  hit,
  latency_ms,
  ran_at
FROM ranked;

GRANT SELECT ON public.uada_benchmark_regression TO authenticated;
GRANT ALL ON public.uada_benchmark_regression TO service_role;

-- 3. uada.planning feature gate
INSERT INTO public.platform_feature_gates (gate, environment, enabled, description)
VALUES
  ('uada.planning', 'preview',    true,  'H14 — enables the UADA Planning engine.'),
  ('uada.planning', 'staging',    true,  'H14 — enables the UADA Planning engine.'),
  ('uada.planning', 'production', false, 'H14 — enables the UADA Planning engine.')
ON CONFLICT (gate, environment) DO NOTHING;