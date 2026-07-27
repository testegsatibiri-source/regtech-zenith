// H13 — SnapshotManager (refinement 1). Server-only.
// H13.5 — Adds lock-based startBuilding via RPC and immutable manifest generation
// inside activate() (single transaction on the client side, guarded by DB trigger).
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyRetention, type SnapshotRecord } from "@/lib/uada/contracts/snapshot/policy";
import { DEFAULT_EMBEDDING_MODEL, DEFAULT_EMBEDDING_DIMENSIONS } from "@/lib/uada/gateway/embeddings.server";
import { GRAPH_SCHEMA_VERSION } from "@/lib/uada/contracts/graph/version";
import { DEFAULT_LOCK_KEY } from "@/lib/uada/reindex/lock";

type Db = SupabaseClient;

async function admin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

export interface PromotionReadiness {
  ok: boolean;
  coverageOk: boolean;
  embeddingsReady: boolean;
  graphValid: boolean;
  zeroPii: boolean;
  reasons: string[];
}

export interface StartBuildingResult {
  acquired: boolean;
  snapshotId?: string;
  version?: number;
}

export const SnapshotManager = {
  /**
   * H13.5 — Acquire the composite advisory lock and create a `building` snapshot
   * in a single SQL transaction. Returns `{ acquired: false }` if another
   * reindex is already in flight.
   */
  async startBuilding(input: {
    model?: string;
    dimensions?: number;
    commitSha?: string;
    schemaHash?: string;
  }): Promise<StartBuildingResult> {
    const db = await admin();
    const { data, error } = await db.rpc("uada_start_reindex", {
      _namespace_id: DEFAULT_LOCK_KEY.namespaceId,
      _repo_id: DEFAULT_LOCK_KEY.repoId,
      _model: input.model ?? DEFAULT_EMBEDDING_MODEL,
      _dimensions: input.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS,
      _commit_sha: input.commitSha ?? null,
      _schema_hash: input.schemaHash ?? null,
      _graph_schema_version: GRAPH_SCHEMA_VERSION,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.acquired) return { acquired: false };
    return { acquired: true, snapshotId: row.snapshot_id, version: row.version };
  },

  /** Legacy path retained for callers that don't need the composite lock. */
  async createBuilding(input: {
    model?: string;
    dimensions?: number;
    commitSha?: string;
    schemaHash?: string;
  }): Promise<{ id: string; version: number }> {
    const db = await admin();
    const { data: latest } = await db
      .from("uada_snapshots")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (latest?.version ?? 0) + 1;

    const { data, error } = await db
      .from("uada_snapshots")
      .insert({
        version,
        state: "building",
        promotion_state: "building",
        commit_sha: input.commitSha ?? null,
        embedding_model: input.model ?? DEFAULT_EMBEDDING_MODEL,
        embedding_dimensions: input.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS,
        schema_hash: input.schemaHash ?? null,
        graph_schema_version: GRAPH_SCHEMA_VERSION,
        stats: {},
      })
      .select("id, version")
      .single();
    if (error) throw error;
    return data;
  },

  async setPromotionState(
    snapshotId: string,
    state:
      | "validating"
      | "promoting"
      | "failed"
      | "cancel_requested"
      | "cancelling"
      | "cancelled",
    failureReason?: string,
  ) {
    const db = await admin();
    const patch: Record<string, unknown> = { promotion_state: state };
    if (state === "failed") {
      patch.failed_at = new Date().toISOString();
      patch.failure_reason = failureReason ?? null;
    }
    const { error } = await db.from("uada_snapshots").update(patch).eq("id", snapshotId);
    if (error) throw error;
  },

  /**
   * H13.5 — Cooperative cancellation. Sets `cancel_requested`; the orchestrator
   * polls this at safe checkpoints and transitions cancelling → cancelled.
   */
  async requestCancel(snapshotId: string): Promise<void> {
    const db = await admin();
    const nowIso = new Date().toISOString();
    const { error } = await db
      .from("uada_snapshots")
      .update({ promotion_state: "cancel_requested" })
      .eq("id", snapshotId)
      .in("promotion_state", ["building", "validating"]);
    if (error) throw error;
    // Mirror on the latest run row.
    await db
      .from("uada_index_runs")
      .update({ cancel_state: "cancel_requested", cancel_requested_at: nowIso })
      .eq("snapshot_id", snapshotId);
  },

  async isCancelRequested(snapshotId: string): Promise<boolean> {
    const db = await admin();
    const { data } = await db
      .from("uada_snapshots")
      .select("promotion_state")
      .eq("id", snapshotId)
      .maybeSingle();
    return data?.promotion_state === "cancel_requested" || data?.promotion_state === "cancelling";
  },

  async validatePromotion(snapshotId: string): Promise<PromotionReadiness> {
    const db = await admin();
    const reasons: string[] = [];

    const { count: pendingCount, error: pendErr } = await db
      .from("uada_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId)
      .neq("status", "ready");
    if (pendErr) throw pendErr;
    const embeddingsReady = (pendingCount ?? 0) === 0;
    if (!embeddingsReady) reasons.push(`${pendingCount} embeddings not ready`);

    const { count: nodeCount, error: nErr } = await db
      .from("uada_graph_nodes")
      .select("id", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId);
    if (nErr) throw nErr;
    const graphValid = (nodeCount ?? 0) > 0;
    if (!graphValid) reasons.push("graph has no nodes");

    const { count: piiCount, error: piiErr } = await db
      .from("uada_documents")
      .select("id", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId)
      .not("content", "is", null)
      .eq("metadata->>denied", "true");
    if (piiErr) throw piiErr;
    const zeroPii = (piiCount ?? 0) === 0;
    if (!zeroPii) reasons.push(`${piiCount} PII documents with content`);

    // H13.5 — read coverage_detail with per-category thresholds
    const { data: run } = await db
      .from("uada_index_runs")
      .select("coverage_detail, coverage")
      .eq("snapshot_id", snapshotId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const coverageDetail = ((run?.coverage_detail as Record<string, {
      ratio: number;
      threshold: number;
    }>) ?? {}) as Record<string, { ratio: number; threshold: number }>;
    const legacy = ((run?.coverage as Record<string, number>) ?? {}) as Record<string, number>;

    let coverageOk = true;
    if (Object.keys(coverageDetail).length > 0) {
      for (const [cat, m] of Object.entries(coverageDetail)) {
        if (m.ratio < m.threshold) {
          coverageOk = false;
          reasons.push(`coverage ${cat}: ${m.ratio.toFixed(2)} < ${m.threshold}`);
        }
      }
    } else {
      coverageOk =
        Object.values(legacy).every((v) => v === 1) && Object.keys(legacy).length > 0;
      if (!coverageOk) reasons.push("coverage < 100%");
    }

    return {
      ok: coverageOk && embeddingsReady && graphValid && zeroPii,
      coverageOk,
      embeddingsReady,
      graphValid,
      zeroPii,
      reasons,
    };
  },

  /**
   * H13.5 — Build the immutable manifest and flip active/archived in one client
   * transaction (best-effort — a DB trigger enforces manifest immutability
   * regardless of race conditions).
   */
  async activate(snapshotId: string): Promise<void> {
    const db = await admin();
    const nowIso = new Date().toISOString();

    const manifest = await buildManifest(db, snapshotId);

    const { error: archErr } = await db
      .from("uada_snapshots")
      .update({ state: "archived", promotion_state: "archived", archived_at: nowIso })
      .eq("state", "active");
    if (archErr) throw archErr;

    const { error: actErr } = await db
      .from("uada_snapshots")
      .update({
        state: "active",
        promotion_state: "active",
        activated_at: nowIso,
        manifest: manifest as never,
      })
      .eq("id", snapshotId);
    if (actErr) throw actErr;
  },

  async getManifest(snapshotId: string): Promise<Record<string, unknown> | null> {
    const db = await admin();
    const { data } = await db
      .from("uada_snapshots")
      .select("manifest")
      .eq("id", snapshotId)
      .maybeSingle();
    return (data?.manifest as Record<string, unknown> | null) ?? null;
  },

  async rollback(targetSnapshotId: string): Promise<void> {
    await this.activate(targetSnapshotId);
  },

  async applyRetention(): Promise<void> {
    const db = await admin();
    const { data, error } = await db
      .from("uada_snapshots")
      .select("id, version, state, created_at, activated_at, archived_at");
    if (error) throw error;
    const records: SnapshotRecord[] = (data ?? []).map((r) => ({
      id: r.id,
      version: r.version,
      state: r.state as SnapshotRecord["state"],
      createdAt: r.created_at,
      activatedAt: r.activated_at ?? undefined,
      archivedAt: r.archived_at ?? undefined,
    }));
    const outcome = applyRetention(records);

    for (const s of outcome.archive) {
      await db
        .from("uada_snapshots")
        .update({ state: "archived", promotion_state: "archived", archived_at: new Date().toISOString() })
        .eq("id", s.id);
    }
    for (const s of outcome.purge) {
      await db.from("uada_snapshots").delete().eq("id", s.id);
    }
  },
};

async function buildManifest(db: Db, snapshotId: string): Promise<Record<string, unknown>> {
  const { data: snap } = await db
    .from("uada_snapshots")
    .select(
      "id, version, embedding_model, embedding_dimensions, schema_hash, commit_sha, graph_schema_version, stats, created_at",
    )
    .eq("id", snapshotId)
    .single();

  const { data: run } = await db
    .from("uada_index_runs")
    .select(
      "coverage, coverage_detail, docs_upserted, docs_denied, graph_nodes, graph_edges, embedding_batches, embedding_tokens, duration_ms",
    )
    .eq("snapshot_id", snapshotId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Snapshot of benchmark results *at promotion time* (may be empty if
  // benchmarks run post-promotion; that's expected and documented).
  const { data: benches } = await db
    .from("uada_benchmark_results")
    .select("benchmark_id, benchmark_version, hit, precision_at_5, recall_at_5, latency_ms")
    .eq("snapshot_id", snapshotId);

  return {
    manifest_version: 1,
    snapshot: {
      id: snap?.id,
      version: snap?.version,
      graph_schema_version: snap?.graph_schema_version,
      embedding_model: snap?.embedding_model,
      embedding_dimensions: snap?.embedding_dimensions,
      commit_sha: snap?.commit_sha,
      schema_hash: snap?.schema_hash,
      created_at: snap?.created_at,
      promoted_at: new Date().toISOString(),
    },
    stats: snap?.stats ?? {},
    coverage: run?.coverage ?? {},
    coverage_detail: run?.coverage_detail ?? {},
    run: {
      docs_upserted: run?.docs_upserted ?? 0,
      docs_denied: run?.docs_denied ?? 0,
      graph_nodes: run?.graph_nodes ?? 0,
      graph_edges: run?.graph_edges ?? 0,
      embedding_batches: run?.embedding_batches ?? 0,
      embedding_tokens: run?.embedding_tokens ?? 0,
      duration_ms: run?.duration_ms ?? 0,
    },
    benchmarks: benches ?? [],
    frozen: true,
  };
}
