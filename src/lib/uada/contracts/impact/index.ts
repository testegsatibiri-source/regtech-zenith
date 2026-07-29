// H14 — Impact contracts (v2). Replaces the ad-hoc ImpactReport shape from H12.5
// for the H14 engine. The v1 `ImpactLevel = "low" | ... | "critical"` stays in
// `contracts/graph` for backward compatibility with pgGraphStore.
import type { Evidence } from "@/lib/uada/contracts/response";
import type { GraphEdge, GraphNode } from "@/lib/uada/contracts/graph";

export type H14ImpactLevel = "direct" | "indirect" | "transitive";
export type EdgeSource = "ast" | "sql" | "docs" | "manifest" | "inferred";

/** Confidence heuristic per edge source (0..1). */
export const EDGE_SOURCE_CONFIDENCE: Record<EdgeSource, number> = {
  ast: 1.0,
  sql: 0.9,
  manifest: 0.8,
  docs: 0.6,
  inferred: 0.4,
};

export interface EdgePath {
  edges: GraphEdge[];
  /** Product of per-edge confidences along the path. */
  aggregateConfidence: number;
}

export interface ImpactNode {
  node: GraphNode;
  level: H14ImpactLevel;
  /** Aggregate over shortest-path edges. 0..1. */
  confidence: number;
  paths: EdgePath[];
}

export interface ImpactReportV2 {
  target: GraphNode;
  depth: number;
  nodes: ImpactNode[];
  totals: { direct: number; indirect: number; transitive: number };
  evidence: Evidence[];
}
