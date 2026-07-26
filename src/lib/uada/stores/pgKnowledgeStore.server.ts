// H13 — Postgres Knowledge Store. Server-only.
import type {
  DocQuery, Document, SearchHit, SearchQuery, Snapshot,
} from "@/lib/uada/contracts/knowledge";
import type { KnowledgeStore } from "@/lib/uada/stores";
import { embedBatch, DEFAULT_EMBEDDING_MODEL } from "@/lib/uada/gateway/embeddings.server";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function toSnapshot(row: {
  id: string; version: number; commit_sha: string | null; created_at: string;
  activated_at: string | null; embedding_model: string; embedding_dimensions: number;
  stats: unknown;
}): Snapshot {
  const stats = (row.stats as Record<string, number>) ?? {};
  return {
    id: row.id,
    version: row.version,
    commitSha: row.commit_sha ?? "",
    indexedAt: row.activated_at ?? row.created_at,
    embeddingModel: row.embedding_model as Snapshot["embeddingModel"],
    embeddingDimensions: row.embedding_dimensions,
    stats: { documents: stats.documents ?? 0, nodes: stats.nodes ?? 0, edges: stats.edges ?? 0 },
  };
}

function toDocument(row: {
  id: string; snapshot_id: string; path: string; kind: string; sha256: string;
  summary: string; metadata: unknown; content: string | null; content_truncated: boolean;
  updated_at: string;
}): Document {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    path: row.path,
    kind: row.kind as Document["kind"],
    sha256: row.sha256,
    summary: row.summary,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    content: row.content ?? undefined,
    contentTruncated: row.content_truncated,
    updatedAt: row.updated_at,
  };
}

export const pgKnowledgeStore: KnowledgeStore = {
  async getActiveSnapshot(): Promise<Snapshot> {
    const c = await db();
    const { data, error } = await c
      .from("uada_snapshots")
      .select("*")
      .eq("state", "active")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("No active snapshot");
    return toSnapshot(data);
  },
  async listSnapshots(): Promise<Snapshot[]> {
    const c = await db();
    const { data, error } = await c
      .from("uada_snapshots")
      .select("*")
      .order("version", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toSnapshot);
  },
  async listDocuments(q: DocQuery): Promise<Document[]> {
    const c = await db();
    let query = c.from("uada_documents").select("*");
    if (q.snapshotId) query = query.eq("snapshot_id", q.snapshotId);
    if (q.kind) query = query.eq("kind", q.kind);
    if (q.pathPrefix) query = query.like("path", `${q.pathPrefix}%`);
    if (q.limit) query = query.limit(q.limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toDocument);
  },
  async getDocument(id: string): Promise<Document | null> {
    const c = await db();
    const { data, error } = await c.from("uada_documents").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toDocument(data) : null;
  },
  async semanticSearch(q: SearchQuery): Promise<SearchHit[]> {
    const c = await db();
    // Resolve snapshot
    const snapId = q.snapshotId ?? (await pgKnowledgeStore.getActiveSnapshot()).id;
    const { data: snap, error: sErr } = await c
      .from("uada_snapshots")
      .select("embedding_model, embedding_dimensions")
      .eq("id", snapId)
      .single();
    if (sErr) throw sErr;

    const { vectors } = await embedBatch([q.text], snap.embedding_model ?? DEFAULT_EMBEDDING_MODEL);
    const query = vectors[0];
    if (!query) return [];
    const topK = q.topK ?? 10;

    // pgvector cosine distance operator via raw RPC not available — fall back to a
    // straight select with ordering client-side isn't scalable, but the H13 dataset
    // is small enough. For real scale, add a `match_uada` SQL function later.
    const { data: rows, error } = await c
      .from("uada_embeddings")
      .select("document_id, embedding")
      .eq("snapshot_id", snapId)
      .eq("status", "ready")
      .eq("embedding_model", snap.embedding_model)
      .eq("embedding_dimensions", snap.embedding_dimensions);
    if (error) throw error;

    const scored: Array<{ documentId: string; score: number }> = [];
    for (const row of rows ?? []) {
      const vec = parseVector((row as { embedding: unknown }).embedding);
      if (!vec || vec.length !== query.length) continue;
      scored.push({ documentId: (row as { document_id: string }).document_id, score: cosine(query, vec) });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, topK);
    if (top.length === 0) return [];

    const { data: docs } = await c
      .from("uada_documents")
      .select("*")
      .in("id", top.map((t) => t.documentId));
    const byId = new Map((docs ?? []).map((d) => [d.id, toDocument(d)]));
    return top.map((t) => ({ document: byId.get(t.documentId)!, score: t.score })).filter((h) => h.document);
  },
};

function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as number[];
    } catch {
      return null;
    }
  }
  return null;
}
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
