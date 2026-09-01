// H14 — Search benchmark runner. Runs stored fixtures against the SearchEngine
// on a snapshot and persists results in uada_benchmark_results.
import { SearchEngine } from "@/lib/uada/engines/search.server";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface BenchmarkRunResult {
  snapshotId: string;
  snapshotVersion: number;
  ran: number;
  hits: number;
  avgPrecision: number;
  regressions: number;
}

export async function runBenchmark(
  opts: { snapshotVersion?: number } = {},
): Promise<BenchmarkRunResult> {
  const c = await db();

  // Resolve target snapshot
  const snapQ = c.from("uada_snapshots").select("id, version");
  const { data: snap } = opts.snapshotVersion
    ? await snapQ.eq("version", opts.snapshotVersion).maybeSingle()
    : await snapQ.eq("state", "active").maybeSingle();
  if (!snap) throw new Error("no snapshot");

  const { data: fixtures } = await c
    .from("uada_search_benchmarks")
    .select("id, slug, query, expected_paths, benchmark_version");
  if (!fixtures || fixtures.length === 0) {
    return {
      snapshotId: snap.id,
      snapshotVersion: snap.version,
      ran: 0,
      hits: 0,
      avgPrecision: 0,
      regressions: 0,
    };
  }

  let hits = 0;
  let precisionSum = 0;

  for (const fx of fixtures) {
    const started = Date.now();
    const resp = await SearchEngine.search({
      query: fx.query as string,
      snapshotVersion: snap.version,
      k: 5,
      minimumScore: 0.1,
      expansionDepth: 0,
    });
    const latencyMs = Date.now() - started;

    const returned = resp.data.map((h) => h.path);
    const expected = new Set((fx.expected_paths as string[]) ?? []);
    const matched = returned.filter((p) => expected.has(p)).length;
    const precision = expected.size > 0 ? matched / Math.min(5, expected.size) : 0;
    const hit = matched > 0;
    if (hit) hits++;
    precisionSum += precision;

    await c.from("uada_benchmark_results").insert({
      benchmark_id: fx.id,
      snapshot_id: snap.id,
      benchmark_version: fx.benchmark_version,
      precision_at_5: precision,
      recall_at_5: expected.size > 0 ? matched / expected.size : 0,
      hit,
      latency_ms: latencyMs,
      returned_paths: returned,
    });
  }

  // Count regressions vs. previous snapshot via view.
  const { data: regRows } = await c
    .from("uada_benchmark_regression")
    .select("status")
    .eq("snapshot_id", snap.id)
    .eq("status", "regression");
  const regressions = (regRows ?? []).length;

  return {
    snapshotId: snap.id,
    snapshotVersion: snap.version,
    ran: fixtures.length,
    hits,
    avgPrecision: fixtures.length > 0 ? precisionSum / fixtures.length : 0,
    regressions,
  };
}
