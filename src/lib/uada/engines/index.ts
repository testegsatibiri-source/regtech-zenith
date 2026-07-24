// H12.5 — Engine interfaces (pure contracts). Implementations arrive at H13+.
import type { UadaResponse } from "@/lib/uada/contracts/response";
import type {
  SearchHit,
  SearchQuery,
  Snapshot,
} from "@/lib/uada/contracts/knowledge";
import type {
  GraphNode,
  ImpactReport,
  TraversalQuery,
} from "@/lib/uada/contracts/graph";

export interface SearchEngine {
  search(q: SearchQuery): Promise<UadaResponse<SearchHit[]>>;
}

export interface ImpactEngine {
  impactOf(nodeId: string, depth?: number): Promise<UadaResponse<ImpactReport>>;
}

export interface GraphEngine {
  traverse(q: TraversalQuery): Promise<UadaResponse<GraphNode[]>>;
  dependenciesOf(nodeId: string): Promise<UadaResponse<GraphNode[]>>;
}

export interface PlanEngine {
  plan(objective: string): Promise<UadaResponse<{ steps: string[]; risks: string[] }>>;
}

export interface ReviewEngine {
  review(input: { diff: string; prNumber?: number }): Promise<UadaResponse<{ findings: unknown[] }>>;
}

export interface AuditEngine {
  audit(scope: string): Promise<UadaResponse<{ findings: unknown[] }>>;
}

export interface DocsEngine {
  render(target: string): Promise<UadaResponse<{ markdown: string }>>;
}

export interface ScoreEngine {
  score(snapshot?: Snapshot): Promise<UadaResponse<{ dimensions: Record<string, number> }>>;
}
