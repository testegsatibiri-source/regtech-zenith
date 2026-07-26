// H13 — Reindex orchestrator. Server-only.
// Wires: manifest → indexers → graph builder → embeddings → SnapshotManager.
import { createHash } from "node:crypto";
import { SnapshotManager } from "@/lib/uada/snapshots/SnapshotManager.server";
import { indexCode } from "@/lib/uada/indexers/code.server";
import { indexDocs } from "@/lib/uada/indexers/docs.server";
import { indexDb } from "@/lib/uada/indexers/db.server";
import { buildGraph } from "@/lib/uada/graph/builder.server";
import { batchSizeFor, embedBatch, DEFAULT_EMBEDDING_MODEL } from "@/lib/uada/gateway/embeddings.server";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export interface ReindexInput {
  mode: "full" | "incremental";
  reason: "manual" | "model_change" | "schema_change" | "corruption";
}

export interface ReindexResult {
  snapshotId: string;
  promotionState: string;
  durationMs: number;
  coverage: Record<string, number>;
  ok: boolean;
  reasons?: string[];
}

export async function runReindex(input: ReindexInput): Promise<ReindexResult> {
  const c = await db();
  const startedAt = Date.now();

  // 1. Create snapshot
  const snap = await SnapshotManager.createBuilding({});
  const runInsert = await c
    .from("uada_index_runs")
    .insert({
      snapshot_id: snap.id,
      mode: input.mode,
      reason: input.reason,
    })
    .select("id")
    .single();
  if (runInsert.error) throw runInsert.error;
  const runId = runInsert.data.id;

  const denyMessages: string[] = [];
  let filesScanned = 0;
  let filesChanged = 0;
  let docsDenied = 0;

  try {
    // 2. Indexers
    const codeIdx = indexCode();
    const docsIdx = indexDocs();
    const dbIdx = await indexDb();
    filesScanned = codeIdx.documents.length + docsIdx.length + dbIdx.documents.length;
    filesChanged = filesScanned; // full reindex — every file is "changed" in the new snapshot

    // 3. Insert documents (code + docs + db-schema)
    const allDocs = [
      ...codeIdx.documents.map((d) => ({
        snapshot_id: snap.id,
        path: d.path,
        kind: d.kind === "code" ? "code" : d.kind,
        sha256: sha256(d.sha256Input),
        summary: d.summary,
        metadata: d.metadata as unknown as object,
        content: null as string | null,
        content_truncated: false,
      })),
      ...docsIdx.map((d) => ({
        snapshot_id: snap.id,
        path: d.path,
        kind: d.kind,
        sha256: sha256(d.sha256Input),
        summary: d.summary,
        metadata: {} as object,
        content: d.content.length > 20000 ? d.content.slice(0, 20000) : d.content,
        content_truncated: d.content.length > 20000,
      })),
      ...dbIdx.documents.map((d) => {
        if (d.denied) docsDenied++;
        return {
          snapshot_id: snap.id,
          path: d.path,
          kind: "schema",
          sha256: sha256(d.sha256Input),
          summary: d.summary,
          metadata: d.metadata as unknown as object,
          content: null as string | null,
          content_truncated: false,
        };
      }),
    ];

    // Normalize doc kinds to allowed enum values
    const allowedKinds = new Set(["code", "route", "migration", "adr", "doc", "config", "schema"]);
    const normalized = allDocs.map((d) => ({
      ...d,
      kind: allowedKinds.has(d.kind) ? d.kind : "code",
    }));

    // Chunked insert
    const insertedDocIds: Array<{ id: string; path: string; summary: string; kind: string }> = [];
    for (let i = 0; i < normalized.length; i += 500) {
      const chunk = normalized.slice(i, i + 500);
      const { data, error } = await c
        .from("uada_documents")
        .insert(chunk)
        .select("id, path, summary, kind");
      if (error) throw error;
      insertedDocIds.push(...(data ?? []));
    }

    // 4. Graph
    const graph = buildGraph(codeIdx, dbIdx);
    // Insert nodes, keep map key→id
    const nodeMap = new Map<string, string>();
    for (let i = 0; i < graph.nodes.length; i += 500) {
      const chunk = graph.nodes.slice(i, i + 500).map((n) => ({
        snapshot_id: snap.id,
        kind: n.kind,
        key: n.key,
        label: n.label,
        path: n.path ?? null,
        metadata: n.metadata as unknown as object,
      }));
      const { data, error } = await c.from("uada_graph_nodes").insert(chunk).select("id, key");
      if (error) throw error;
      for (const row of data ?? []) nodeMap.set(row.key, row.id);
    }
    // Insert edges
    let edgesInserted = 0;
    const edgeRows = graph.edges
      .map((e) => {
        const from = nodeMap.get(e.fromKey);
        const to = nodeMap.get(e.toKey);
        if (!from || !to) return null;
        return {
          snapshot_id: snap.id,
          from_node: from,
          to_node: to,
          kind: e.kind,
          metadata: (e.metadata ?? {}) as unknown as object,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    for (let i = 0; i < edgeRows.length; i += 500) {
      const chunk = edgeRows.slice(i, i + 500);
      const { error } = await c.from("uada_graph_edges").insert(chunk);
      if (error) throw error;
      edgesInserted += chunk.length;
    }

    // 5. Embeddings — batch summaries only (fast, cheap).
    const model = DEFAULT_EMBEDDING_MODEL;
    const dims = 3072;
    const batchSize = batchSizeFor(model);
    // Only embed non-denied docs
    const embedTargets = insertedDocIds.filter((d) => d.summary.trim().length > 0);
    // Pre-insert pending rows
    for (let i = 0; i < embedTargets.length; i += 500) {
      const rows = embedTargets.slice(i, i + 500).map((d) => ({
        document_id: d.id,
        snapshot_id: snap.id,
        embedding_model: model,
        embedding_dimensions: dims,
        status: "pending",
      }));
      const { error } = await c.from("uada_embeddings").insert(rows);
      if (error) throw error;
    }

    let embeddingBatches = 0;
    let embeddingTokens = 0;
    for (let i = 0; i < embedTargets.length; i += batchSize) {
      const chunk = embedTargets.slice(i, i + batchSize);
      // mark processing
      await c
        .from("uada_embeddings")
        .update({ status: "processing" })
        .eq("snapshot_id", snap.id)
        .in("document_id", chunk.map((d) => d.id));
      try {
        const { vectors, tokens } = await embedBatch(
          chunk.map((d) => `${d.kind}: ${d.path}\n${d.summary}`),
          model,
        );
        embeddingBatches++;
        embeddingTokens += tokens;
        // update each row with its vector
        for (let j = 0; j < chunk.length; j++) {
          const vec = vectors[j];
          if (!vec) continue;
          await c
            .from("uada_embeddings")
            .update({
              embedding: `[${vec.join(",")}]` as unknown as never,
              status: "ready",
              last_embedded_at: new Date().toISOString(),
            })
            .eq("document_id", chunk[j].id)
            .eq("snapshot_id", snap.id);
        }
      } catch (err) {
        // Mark failed for this batch and continue
        await c
          .from("uada_embeddings")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : String(err),
          })
          .eq("snapshot_id", snap.id)
          .in("document_id", chunk.map((d) => d.id));
        denyMessages.push(`embed batch failed: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    // 6. Coverage snapshot
    const coverage: Record<string, number> = {
      code: codeIdx.documents.length > 0 ? 1 : 0,
      docs: docsIdx.filter((d) => d.kind === "doc" || d.kind === "adr").length > 0 ? 1 : 0,
      migrations: docsIdx.filter((d) => d.kind === "migration").length > 0 ? 1 : 0,
      schema: dbIdx.documents.length > 0 ? 1 : 0,
      routes: codeIdx.documents.filter((d) => d.metadata.isRoute).length > 0 ? 1 : 0,
      server_fns: codeIdx.documents.filter((d) => d.metadata.hasServerFn).length > 0 ? 1 : 0,
    };

    // 7. Persist stats on snapshot + finalize run
    await c
      .from("uada_snapshots")
      .update({
        stats: {
          documents: insertedDocIds.length,
          nodes: nodeMap.size,
          edges: edgesInserted,
          orphans: graph.orphanCount,
        },
      })
      .eq("id", snap.id);

    // 8. Validate promotion
    await SnapshotManager.setPromotionState(snap.id, "validating");
    // First, write the run row so validation can read coverage
    await c
      .from("uada_index_runs")
      .update({
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        files_scanned: filesScanned,
        files_changed: filesChanged,
        docs_upserted: insertedDocIds.length,
        docs_denied: docsDenied,
        graph_nodes: nodeMap.size,
        graph_edges: edgesInserted,
        embedding_batches: embeddingBatches,
        embedding_tokens: embeddingTokens,
        coverage,
        ok: true,
      })
      .eq("id", runId);

    const readiness = await SnapshotManager.validatePromotion(snap.id);
    if (!readiness.ok) {
      await SnapshotManager.setPromotionState(snap.id, "failed", readiness.reasons.join("; "));
      return {
        snapshotId: snap.id,
        promotionState: "failed",
        durationMs: Date.now() - startedAt,
        coverage,
        ok: false,
        reasons: readiness.reasons,
      };
    }

    // 9. Promote
    await SnapshotManager.setPromotionState(snap.id, "promoting");
    await SnapshotManager.activate(snap.id);
    await SnapshotManager.applyRetention();

    return {
      snapshotId: snap.id,
      promotionState: "active",
      durationMs: Date.now() - startedAt,
      coverage,
      ok: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await SnapshotManager.setPromotionState(snap.id, "failed", msg);
    await c
      .from("uada_index_runs")
      .update({
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        ok: false,
        error: msg,
      })
      .eq("id", runId);
    return {
      snapshotId: snap.id,
      promotionState: "failed",
      durationMs: Date.now() - startedAt,
      coverage: {},
      ok: false,
      reasons: [msg],
    };
  }
}
