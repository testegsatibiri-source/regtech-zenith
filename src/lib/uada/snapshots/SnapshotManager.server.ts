// H13 — SnapshotManager (refinement 1). Server-only.
// Handles the snapshot lifecycle: create → validate → promote → archive → retention.
// Callers: reindex() today; H14/H15/H16/H20 later.
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyRetention, type SnapshotRecord } from "@/lib/uada/contracts/snapshot/policy";
import { DEFAULT_EMBEDDING_MODEL, DEFAULT_EMBEDDING_DIMENSIONS } from "@/lib/uada/gateway/embeddings.server";

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

export const SnapshotManager = {
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
        stats: {},
      })
      .select("id, version")
      .single();
    if (error) throw error;
    return data;
  },

  async setPromotionState(
    snapshotId: string,
    state: "validating" | "promoting" | "failed",
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

  async validatePromotion(snapshotId: string): Promise<PromotionReadiness> {
    const db = await admin();
    const reasons: string[] = [];

    // Embeddings all ready?
    const { count: pendingCount, error: pendErr } = await db
      .from("uada_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId)
      .neq("status", "ready");
    if (pendErr) throw pendErr;
    const embeddingsReady = (pendingCount ?? 0) === 0;
    if (!embeddingsReady) reasons.push(`${pendingCount} embeddings not ready`);

    // Graph present?
    const { count: nodeCount, error: nErr } = await db
      .from("uada_graph_nodes")
      .select("id", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId);
    if (nErr) throw nErr;
    const graphValid = (nodeCount ?? 0) > 0;
    if (!graphValid) reasons.push("graph has no nodes");

    // Zero PII: any doc marked denied with content?
    const { count: piiCount, error: piiErr } = await db
      .from("uada_documents")
      .select("id", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId)
      .not("content", "is", null)
      .eq("metadata->>denied", "true");
    if (piiErr) throw piiErr;
    const zeroPii = (piiCount ?? 0) === 0;
    if (!zeroPii) reasons.push(`${piiCount} PII documents with content`);

    // Coverage: derived from the latest index_run row for this snapshot.
    const { data: run } = await db
      .from("uada_index_runs")
      .select("coverage")
      .eq("snapshot_id", snapshotId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const coverage = ((run?.coverage as Record<string, unknown>) ?? {}) as Record<string, number>;
    const coverageOk = Object.values(coverage).every((v) => v === 1) && Object.keys(coverage).length > 0;
    if (!coverageOk) reasons.push("coverage < 100%");

    return { ok: coverageOk && embeddingsReady && graphValid && zeroPii, coverageOk, embeddingsReady, graphValid, zeroPii, reasons };
  },

  async activate(snapshotId: string): Promise<void> {
    const db = await admin();
    // Archive previous active, then promote — single RPC would be ideal, but PostgREST
    // handles this as two writes; the unique partial index enforces the invariant.
    const nowIso = new Date().toISOString();
    const { error: archErr } = await db
      .from("uada_snapshots")
      .update({ state: "archived", promotion_state: "archived", archived_at: nowIso })
      .eq("state", "active");
    if (archErr) throw archErr;

    const { error: actErr } = await db
      .from("uada_snapshots")
      .update({ state: "active", promotion_state: "active", activated_at: nowIso })
      .eq("id", snapshotId);
    if (actErr) throw actErr;
  },

  async rollback(targetSnapshotId: string): Promise<void> {
    // Reuse activate — no reindex, just flip. targetSnapshotId must be archived.
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
