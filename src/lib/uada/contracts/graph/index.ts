// H12.5 — Graph Store contracts. Isolated from Knowledge Store on purpose.

export type NodeKind =
  | "file"
  | "route"
  | "server_fn"
  | "table"
  | "column"
  | "rpc"
  | "policy"
  | "migration"
  | "adr"
  | "pack"
  | "provider"
  | "plugin";

export type EdgeKind =
  | "imports"
  | "calls"
  | "queries"
  | "writes"
  | "depends_on"
  | "implements_adr"
  | "belongs_to_plugin"
  | "grants"
  | "references";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  path?: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  fromId: string;
  toId: string;
  kind: EdgeKind;
  metadata?: Record<string, unknown>;
}

export type ImpactLevel = "low" | "medium" | "high" | "critical";

export interface ImpactReport {
  target: GraphNode;
  level: ImpactLevel;
  reasons: string[];
  affected: GraphNode[];
  depth: number;
}

export interface TraversalQuery {
  nodeId: string;
  edge?: EdgeKind;
  depth?: number;
  limit?: number;
}
