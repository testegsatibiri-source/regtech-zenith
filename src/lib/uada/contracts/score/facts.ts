// H16 — Architecture facts contract. The read-only projection of a snapshot the
// ScoreEngine needs. Produced ONLY by ContextAssembler.assembleArchitecture()
// (ADR-0029: no engine touches a store directly).
import type { GraphEdge, GraphNode } from "@/lib/uada/contracts/graph";

export interface ArchitectureDocumentFact {
  path: string;
  kind: string;
  hasSummary: boolean;
  updatedAt: string;
}

export interface ArchitectureFacts {
  snapshotId: string;
  snapshotVersion: number;
  /** ISO timestamp of the snapshot creation. */
  snapshotCreatedAt: string;
  /** Reference instant used for freshness. Injected so tests stay deterministic. */
  now: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  documents: ArchitectureDocumentFact[];
  embeddings: { ready: number; failed: number; pending: number };
}
