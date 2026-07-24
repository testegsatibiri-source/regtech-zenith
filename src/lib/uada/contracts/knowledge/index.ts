// H12.5 — Knowledge Store contracts. Documents, snapshots, embeddings.
// Deliberately isolated from the Graph Store contracts (ADR-0020).

export type DocumentKind =
  | "code"
  | "route"
  | "migration"
  | "adr"
  | "doc"
  | "config"
  | "schema";

export type EmbeddingModel =
  | "google/gemini-embedding-001"
  | "google/gemini-embedding-2"
  | "openai/text-embedding-3-small"
  | "openai/text-embedding-3-large";

export interface EmbeddingRef {
  model: EmbeddingModel;
  dimensions: number;
  /** Opaque handle; the store owns the physical vector column. */
  vectorId?: string;
}

export interface Document {
  id: string;
  snapshotId: string;
  path: string;
  kind: DocumentKind;
  sha256: string;
  summary: string;
  metadata: Record<string, unknown>;
  /** Present only for small files or explicitly-kept documents. */
  content?: string;
  contentTruncated: boolean;
  updatedAt: string;
  embedding?: EmbeddingRef;
}

export interface Snapshot {
  id: string;
  version: number;
  commitSha: string;
  indexedAt: string;
  embeddingModel: EmbeddingModel;
  embeddingDimensions: number;
  stats: {
    documents: number;
    nodes: number;
    edges: number;
  };
}

export interface DocQuery {
  snapshotId?: string;
  kind?: DocumentKind;
  pathPrefix?: string;
  limit?: number;
}

export interface SearchQuery {
  text: string;
  snapshotId?: string;
  topK?: number;
  kinds?: DocumentKind[];
}

export interface SearchHit {
  document: Document;
  score: number;
}
