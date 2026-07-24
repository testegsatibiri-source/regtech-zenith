// H12.5 — Store interfaces. Knowledge and Graph are deliberately separate
// components (ADR-0020) even though H13 will back both with Postgres.
import type {
  DocQuery,
  Document,
  SearchHit,
  SearchQuery,
  Snapshot,
} from "@/lib/uada/contracts/knowledge";
import type {
  EdgeKind,
  GraphEdge,
  GraphNode,
  ImpactReport,
  TraversalQuery,
} from "@/lib/uada/contracts/graph";

export interface KnowledgeStore {
  getActiveSnapshot(): Promise<Snapshot>;
  listSnapshots(): Promise<Snapshot[]>;
  listDocuments(q: DocQuery): Promise<Document[]>;
  getDocument(id: string): Promise<Document | null>;
  semanticSearch(q: SearchQuery): Promise<SearchHit[]>;
}

export interface GraphStore {
  getNode(id: string): Promise<GraphNode | null>;
  neighbors(nodeId: string, edge?: EdgeKind): Promise<GraphNode[]>;
  traverse(q: TraversalQuery): Promise<GraphNode[]>;
  edges(nodeId: string): Promise<GraphEdge[]>;
  impactOf(nodeId: string, depth?: number): Promise<ImpactReport>;
  dependenciesOf(nodeId: string): Promise<GraphNode[]>;
}
