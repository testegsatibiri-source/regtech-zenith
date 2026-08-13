// H14 — ContextAssembler (server-only). ADR-0029 — Context Assembly Principle.
// The ONLY component that touches KnowledgeStore, GraphStore or MemoryStore.
// Deterministic: same request + same snapshot => byte-identical bundle.
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";
import { classify } from "@/lib/packs/catalog";
import type { SupabaseClient } from "@supabase/supabase-js";


import type {
  ContextBundle,
  ContextMetrics,
  ContextRequest,
  DocumentRef,
  MemoryEntry,
} from "@/lib/uada/contracts/context";
import type { Evidence } from "@/lib/uada/contracts/response";
import type { GraphEdge, GraphNode } from "@/lib/uada/contracts/graph";
import type { ArchitectureFacts } from "@/lib/uada/contracts/score/facts";

import { computeEvidenceHash } from "@/lib/uada/contracts/response/hash";
import {
  DEFAULT_EMBEDDING_MODEL,
  embedBatch,
} from "@/lib/uada/gateway/embeddings.server";

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

const encoder = new TextEncoder();
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as number[]; } catch { return null; }
  }
  return null;
}

interface SnapshotRow {
  id: string;
  version: number;
  embedding_model: string;
  embedding_dimensions: number;
}

async function resolveSnapshot(db: SupabaseClient, version?: number): Promise<SnapshotRow> {
  const q = db.from("uada_snapshots").select("id, version, embedding_model, embedding_dimensions");
  const { data, error } = version
    ? await q.eq("version", version).maybeSingle()
    : await q.eq("state", "active").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(version ? `snapshot v${version} not found` : "no active snapshot");
  return data as SnapshotRow;
}

async function assembleDocuments(
  db: SupabaseClient,
  snap: SnapshotRow,
  req: ContextRequest,
): Promise<{ docs: DocumentRef[]; embeddingMs: number }> {
  if (!req.includeDocs) return { docs: [], embeddingMs: 0 };
  const t0 = Date.now();
  const { vectors } = await embedBatch(
    [req.objective],
    req.embeddingModel ?? snap.embedding_model ?? DEFAULT_EMBEDDING_MODEL,
  );
  const embeddingMs = Date.now() - t0;
  const query = vectors[0];
  if (!query) return { docs: [], embeddingMs };

  const { data: rows, error } = await db
    .from("uada_embeddings")
    .select("document_id, embedding")
    .eq("snapshot_id", snap.id)
    .eq("status", "ready")
    .eq("embedding_model", snap.embedding_model)
    .eq("embedding_dimensions", snap.embedding_dimensions);
  if (error) throw error;

  const minScore = req.minimumScore ?? 0;
  const scored: Array<{ documentId: string; score: number }> = [];
  for (const row of rows ?? []) {
    const vec = parseVector((row as { embedding: unknown }).embedding);
    if (!vec || vec.length !== query.length) continue;
    const s = cosine(query, vec);
    if (s < minScore) continue;
    scored.push({ documentId: (row as { document_id: string }).document_id, score: s });
  }
  // Deterministic ordering: score desc, then document_id asc as tiebreaker.
  scored.sort((a, b) => (b.score - a.score) || a.documentId.localeCompare(b.documentId));
  const top = scored.slice(0, req.maxDocuments);
  if (top.length === 0) return { docs: [], embeddingMs };

  const { data: documents } = await db
    .from("uada_documents")
    .select("id, path, kind, summary")
    .in("id", top.map((t) => t.documentId));
  const byId = new Map((documents ?? []).map((d) => [d.id, d]));
  const docs: DocumentRef[] = top
    .map((t) => {
      const d = byId.get(t.documentId);
      if (!d) return null;
      return {
        id: d.id,
        path: d.path,
        kind: d.kind,
        summary: d.summary,
        score: Math.round(t.score * 10000) / 10000, // stable rounding for hash determinism
      } satisfies DocumentRef;
    })
    .filter((x): x is DocumentRef => x !== null)
    // Enforce final deterministic order for the bundle body.
    .sort((a, b) => (b.score - a.score) || a.path.localeCompare(b.path));

  return { docs, embeddingMs };
}

async function expandGraph(
  db: SupabaseClient,
  snap: SnapshotRow,
  req: ContextRequest,
  docPaths: string[],
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[]; expansionMs: number }> {
  if (!req.includeGraph) return { nodes: [], edges: [], expansionMs: 0 };
  const t0 = Date.now();

  // Anchor nodes: explicit ids + nodes whose path matches a top document.
  const anchorIds = new Set<string>(req.anchorNodeIds ?? []);
  if (docPaths.length > 0) {
    const { data: pathNodes } = await db
      .from("uada_graph_nodes")
      .select("id")
      .eq("snapshot_id", snap.id)
      .in("path", docPaths.slice(0, 50));
    for (const n of pathNodes ?? []) anchorIds.add(n.id as string);
  }

  const seen = new Set<string>(anchorIds);
  let frontier = [...anchorIds];
  const edgeRows: GraphEdge[] = [];

  for (let hop = 0; hop < req.expansionDepth && frontier.length > 0; hop++) {
    const { data: outEdges } = await db
      .from("uada_graph_edges")
      .select("from_node, to_node, kind, metadata, confidence, source")
      .eq("snapshot_id", snap.id)
      .in("from_node", frontier);
    const next = new Set<string>();
    for (const e of outEdges ?? []) {
      const meta = ((e.metadata as Record<string, unknown>) ?? {});
      edgeRows.push({
        fromId: e.from_node as string,
        toId: e.to_node as string,
        kind: e.kind as GraphEdge["kind"],
        metadata: {
          ...meta,
          confidence: (e as { confidence?: number }).confidence ?? 1,
          source: (e as { source?: string }).source ?? "ast",
        },
      });
      if (!seen.has(e.to_node as string)) {
        seen.add(e.to_node as string);
        next.add(e.to_node as string);
      }
    }
    frontier = [...next];
  }

  const nodes: GraphNode[] = [];
  if (seen.size > 0) {
    const { data: nodeRows } = await db
      .from("uada_graph_nodes")
      .select("id, kind, label, path, metadata")
      .in("id", [...seen]);
    for (const n of nodeRows ?? []) {
      nodes.push({
        id: n.id as string,
        kind: n.kind as GraphNode["kind"],
        label: n.label as string,
        path: (n.path as string | null) ?? undefined,
        metadata: (n.metadata as Record<string, unknown>) ?? {},
      });
    }
  }

  // Deterministic ordering.
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edgeRows.sort((a, b) =>
    (a.fromId + a.toId + a.kind).localeCompare(b.fromId + b.toId + b.kind),
  );

  return { nodes, edges: edgeRows, expansionMs: Date.now() - t0 };
}

async function loadMemory(
  db: SupabaseClient,
  req: ContextRequest,
): Promise<MemoryEntry[]> {
  if (!req.includeMemory) return [];
  const { data } = await db
    .from("uada_memory")
    .select("scope, key, value")
    .or("expires_at.is.null,expires_at.gt.now()")
    .limit(50);
  const rows = (data ?? []) as Array<{ scope: string; key: string; value: unknown }>;
  return rows
    .map((r) => ({ scope: r.scope, key: r.key, value: (r.value as Record<string, unknown>) ?? {} }))
    .sort((a, b) => (a.scope + a.key).localeCompare(b.scope + b.key));
}

async function buildEvidence(
  docs: DocumentRef[],
  snapshotVersion: number,
): Promise<Evidence[]> {
  const evidence: Evidence[] = [];
  for (const d of docs) {
    const partial = {
      source: "code" as const,
      path: d.path,
      score: d.score,
      snapshotVersion,
    };
    const hash = await computeEvidenceHash(partial);
    evidence.push({ ...partial, evidenceHash: hash });
  }
  return evidence;
}

/** Rough token estimator: 4 chars ≈ 1 token. Sufficient for budgeting. */
function estimateTokens(bundle: {
  documents: DocumentRef[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  memory: MemoryEntry[];
}): number {
  let chars = 0;
  for (const d of bundle.documents) chars += d.path.length + d.summary.length;
  for (const n of bundle.nodes) chars += n.label.length + (n.path?.length ?? 0);
  for (const e of bundle.edges) chars += e.fromId.length + e.toId.length + e.kind.length;
  for (const m of bundle.memory) chars += m.scope.length + m.key.length + 64;
  return Math.ceil(chars / 4);
}

async function assembleArchitecture(
  version?: number,
  now?: string,
): Promise<ArchitectureFacts> {
  const db = await admin();
  const snap = await resolveSnapshot(db, version);

  const { data: snapRow } = await db
    .from("uada_snapshots")
    .select("created_at")
    .eq("id", snap.id)
    .maybeSingle();

  const { data: nodeRows, error: nodeErr } = await db
    .from("uada_graph_nodes")
    .select("id, kind, label, path, metadata")
    .eq("snapshot_id", snap.id)
    .order("id", { ascending: true });
  if (nodeErr) throw nodeErr;

  const { data: edgeRows, error: edgeErr } = await db
    .from("uada_graph_edges")
    .select("from_node, to_node, kind, metadata")
    .eq("snapshot_id", snap.id)
    .order("from_node", { ascending: true });
  if (edgeErr) throw edgeErr;

  const { data: docRows, error: docErr } = await db
    .from("uada_documents")
    .select("path, kind, summary, updated_at")
    .eq("snapshot_id", snap.id)
    .order("path", { ascending: true });
  if (docErr) throw docErr;

  const { data: embRows, error: embErr } = await db
    .from("uada_embeddings")
    .select("status")
    .eq("snapshot_id", snap.id);
  if (embErr) throw embErr;

  const embeddings = { ready: 0, failed: 0, pending: 0 };
  for (const row of (embRows ?? []) as Array<{ status: string }>) {
    if (row.status === "ready") embeddings.ready++;
    else if (row.status === "failed") embeddings.failed++;
    else embeddings.pending++;
  }

  return {
    snapshotId: snap.id,
    snapshotVersion: snap.version,
    snapshotCreatedAt:
      (snapRow as { created_at?: string } | null)?.created_at ?? new Date(0).toISOString(),
    now: now ?? new Date().toISOString(),
    nodes: ((nodeRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      kind: r.kind as GraphNode["kind"],
      label: String(r.label ?? ""),
      path: (r.path as string | null) ?? undefined,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    })),
    edges: ((edgeRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
      fromId: String(r.from_node),
      toId: String(r.to_node),
      kind: r.kind as GraphEdge["kind"],
      metadata: (r.metadata as Record<string, unknown>) ?? undefined,
    })),
    documents: ((docRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
      path: String(r.path),
      kind: String(r.kind),
      hasSummary: typeof r.summary === "string" && r.summary.trim().length > 0,
      updatedAt: String(r.updated_at ?? ""),
    })),
    embeddings,
  };
}

export const ContextAssembler = {
  /**
   * H16 — Read-only architecture projection for the ScoreEngine. Lives here so
   * the assembler remains the single component touching the stores (ADR-0029).
   */
  assembleArchitecture,

  async assemble(req: ContextRequest): Promise<ContextBundle> {
    const started = Date.now();
    const db = await admin();
    const snap = await resolveSnapshot(db, req.snapshotVersion);

    const { docs, embeddingMs } = await assembleDocuments(db, snap, req);
    const docPaths = docs.map((d) => d.path);
    const { nodes, edges, expansionMs } = await expandGraph(db, snap, req, docPaths);
    const memory = await loadMemory(db, req);

    const evidence = await buildEvidence(docs, snap.version);
    const tokens = estimateTokens({ documents: docs, nodes, edges, memory });

    const metrics: ContextMetrics = {
      documents: docs.length,
      nodes: nodes.length,
      edges: edges.length,
      tokens,
      assemblyMs: Date.now() - started,
      expansionMs,
      embeddingMs,
    };

    // Canonical body for hash: everything the caller can observe *except*
    // the timing metrics (which are inherently non-deterministic).
    const canonical = JSON.stringify({
      snapshotVersion: snap.version,
      documents: docs,
      nodes,
      edges,
      memory,
      evidence,
      tokens,
    });
    const bundleHash = await sha256Hex(canonical);

    return {
      snapshotVersion: snap.version,
      snapshotId: snap.id,
      documents: docs,
      nodes,
      edges,
      memory,
      evidence,
      metrics,
      bundleHash,
    };
  },
};
