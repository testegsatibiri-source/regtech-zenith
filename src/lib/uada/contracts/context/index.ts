// H14 — ContextAssembler contracts. The ONE way to build context for any engine.
// See ADR-0029 (Context Assembly Principle).
import type { Evidence } from "@/lib/uada/contracts/response";
import type { GraphEdge, GraphNode } from "@/lib/uada/contracts/graph";

export interface DocumentRef {
  id: string;
  path: string;
  kind: string;
  summary: string;
  score: number;
}

export interface MemoryEntry {
  scope: string;
  key: string;
  value: Record<string, unknown>;
}

export interface ContextRequest {
  objective: string;
  snapshotVersion?: number;
  maxDocuments: number;
  maxTokens: number;
  /** 0 = no graph expansion, N = expand N hops around top documents. */
  expansionDepth: number;
  includeDocs: boolean;
  includeGraph: boolean;
  includeMemory: boolean;
  /** Explicit anchors — used by ImpactEngine (start from a known node). */
  anchorNodeIds?: string[];
  embeddingModel?: string;
  /** Lower bound for cosine score of doc hits; sub-threshold are dropped. */
  minimumScore?: number;
}

export interface ContextMetrics {
  documents: number;
  nodes: number;
  edges: number;
  tokens: number;
  assemblyMs: number;
  expansionMs: number;
  embeddingMs: number;
}

export interface ContextBundle {
  snapshotVersion: number;
  snapshotId: string;
  documents: DocumentRef[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  memory: MemoryEntry[];
  evidence: Evidence[];
  metrics: ContextMetrics;
  /** SHA-256 of the canonical bundle body. Enables determinism assertions. */
  bundleHash: string;
}
