// H14 — ImpactEngine. Delegates to ContextAssembler for graph expansion.
// Classifies reachable nodes into direct/indirect/transitive and aggregates
// per-edge confidence into a single confidence score for the impacted node.
import type { UadaResponse } from "@/lib/uada/contracts/response";
import type { GraphEdge } from "@/lib/uada/contracts/graph";
import type {
  EdgePath,
  H14ImpactLevel,
  ImpactNode,
  ImpactReportV2,
} from "@/lib/uada/contracts/impact";
import { EDGE_SOURCE_CONFIDENCE } from "@/lib/uada/contracts/impact";
import { assertEvidenceComplete } from "@/lib/uada/contracts/response/hash";
import { ContextAssembler } from "@/lib/uada/context/ContextAssembler.server";

export interface ImpactOptions {
  nodeId: string;
  depth: number;
  snapshotVersion?: number;
}

function levelForHop(hop: number): H14ImpactLevel {
  if (hop <= 1) return "direct";
  if (hop === 2) return "indirect";
  return "transitive";
}

function edgeConfidence(edge: GraphEdge): number {
  const meta = (edge.metadata ?? {}) as { confidence?: number; source?: keyof typeof EDGE_SOURCE_CONFIDENCE };
  if (typeof meta.confidence === "number") return meta.confidence;
  if (meta.source && EDGE_SOURCE_CONFIDENCE[meta.source] != null) {
    return EDGE_SOURCE_CONFIDENCE[meta.source];
  }
  return 1;
}

export const ImpactEngine = {
  async impactOf(opts: ImpactOptions): Promise<UadaResponse<ImpactReportV2>> {
    const bundle = await ContextAssembler.assemble({
      objective: `impact:${opts.nodeId}`,
      snapshotVersion: opts.snapshotVersion,
      maxDocuments: 0,
      maxTokens: 0,
      expansionDepth: opts.depth,
      includeDocs: false,
      includeGraph: true,
      includeMemory: false,
      anchorNodeIds: [opts.nodeId],
    });

    const nodeById = new Map(bundle.nodes.map((n) => [n.id, n]));
    const target = nodeById.get(opts.nodeId);
    if (!target) {
      throw new Error(`impact: node ${opts.nodeId} not found in snapshot v${bundle.snapshotVersion}`);
    }

    // BFS over bundle.edges to compute per-node shortest-path hop + best confidence path.
    const outByFrom = new Map<string, GraphEdge[]>();
    for (const e of bundle.edges) {
      const list = outByFrom.get(e.fromId) ?? [];
      list.push(e);
      outByFrom.set(e.fromId, list);
    }

    interface Reached {
      hop: number;
      paths: EdgePath[];
    }
    const reached = new Map<string, Reached>();
    reached.set(opts.nodeId, { hop: 0, paths: [{ edges: [], aggregateConfidence: 1 }] });

    let frontier: Array<{ id: string; path: EdgePath }> = [
      { id: opts.nodeId, path: { edges: [], aggregateConfidence: 1 } },
    ];
    for (let hop = 1; hop <= opts.depth && frontier.length > 0; hop++) {
      const next: Array<{ id: string; path: EdgePath }> = [];
      for (const { id, path } of frontier) {
        for (const edge of outByFrom.get(id) ?? []) {
          const newPath: EdgePath = {
            edges: [...path.edges, edge],
            aggregateConfidence: path.aggregateConfidence * edgeConfidence(edge),
          };
          const existing = reached.get(edge.toId);
          if (!existing || existing.hop > hop) {
            reached.set(edge.toId, { hop, paths: [newPath] });
          } else if (existing.hop === hop && existing.paths.length < 3) {
            existing.paths.push(newPath);
          }
          if (!existing) next.push({ id: edge.toId, path: newPath });
        }
      }
      frontier = next;
    }

    const nodes: ImpactNode[] = [];
    const totals = { direct: 0, indirect: 0, transitive: 0 };
    for (const [id, r] of reached.entries()) {
      if (id === opts.nodeId) continue;
      const node = nodeById.get(id);
      if (!node) continue;
      const level = levelForHop(r.hop);
      totals[level]++;
      const best = r.paths.reduce((m, p) => Math.max(m, p.aggregateConfidence), 0);
      nodes.push({ node, level, confidence: Math.round(best * 10000) / 10000, paths: r.paths });
    }

    nodes.sort((a, b) => a.level.localeCompare(b.level) || b.confidence - a.confidence);

    const report: ImpactReportV2 = {
      target,
      depth: opts.depth,
      nodes,
      totals,
      evidence: bundle.evidence,
    };

    const resp: UadaResponse<ImpactReportV2> = {
      data: report,
      confidence: nodes.length > 0 ? 0.85 : 0,
      snapshotVersion: bundle.snapshotVersion,
      filesUsed: nodes.map((n) => n.node.path ?? n.node.label),
      model: "impact",
      evidence: bundle.evidence,
      warnings: nodes.length === 0
        ? [{ code: "no_impact_edges", message: "no outgoing edges from anchor within depth" }]
        : undefined,
    };
    await assertEvidenceComplete(resp, { minEvidence: 0 });
    return resp;
  },
};
