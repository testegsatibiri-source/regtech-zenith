// H13 — Postgres Graph Store. Server-only.
import type {
  EdgeKind, GraphEdge, GraphNode, ImpactReport, TraversalQuery,
} from "@/lib/uada/contracts/graph";
import type { GraphStore } from "@/lib/uada/stores";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function toNode(row: {
  id: string; kind: string; key: string; label: string; path: string | null; metadata: unknown;
}): GraphNode {
  return {
    id: row.id,
    kind: row.kind as GraphNode["kind"],
    label: row.label,
    path: row.path ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

async function activeSnapshotId(): Promise<string> {
  const c = await db();
  const { data, error } = await c.from("uada_snapshots").select("id").eq("state", "active").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No active snapshot");
  return data.id;
}

export const pgGraphStore: GraphStore = {
  async getNode(id: string): Promise<GraphNode | null> {
    const c = await db();
    const { data, error } = await c.from("uada_graph_nodes").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toNode(data) : null;
  },
  async neighbors(nodeId: string, edge?: EdgeKind): Promise<GraphNode[]> {
    const c = await db();
    let q = c.from("uada_graph_edges").select("to_node").eq("from_node", nodeId);
    if (edge) q = q.eq("kind", edge);
    const { data: edges, error } = await q;
    if (error) throw error;
    const ids = (edges ?? []).map((e) => e.to_node);
    if (ids.length === 0) return [];
    const { data: nodes } = await c.from("uada_graph_nodes").select("*").in("id", ids);
    return (nodes ?? []).map(toNode);
  },
  async traverse(q: TraversalQuery): Promise<GraphNode[]> {
    const depth = q.depth ?? 2;
    const limit = q.limit ?? 100;
    const seen = new Set<string>();
    let frontier = [q.nodeId];
    const collected: GraphNode[] = [];
    for (let d = 0; d < depth && frontier.length && collected.length < limit; d++) {
      const next = new Set<string>();
      for (const nid of frontier) {
        const neighbors = await this.neighbors(nid, q.edge);
        for (const n of neighbors) {
          if (seen.has(n.id)) continue;
          seen.add(n.id);
          collected.push(n);
          next.add(n.id);
          if (collected.length >= limit) break;
        }
      }
      frontier = [...next];
    }
    return collected;
  },
  async edges(nodeId: string): Promise<GraphEdge[]> {
    const c = await db();
    const { data, error } = await c
      .from("uada_graph_edges")
      .select("from_node, to_node, kind, metadata")
      .or(`from_node.eq.${nodeId},to_node.eq.${nodeId}`);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      fromId: r.from_node,
      toId: r.to_node,
      kind: r.kind as GraphEdge["kind"],
      metadata: (r.metadata as Record<string, unknown>) ?? undefined,
    }));
  },
  async impactOf(nodeId: string, depth = 2): Promise<ImpactReport> {
    await activeSnapshotId(); // ensure snapshot exists
    const target = await this.getNode(nodeId);
    if (!target) throw new Error(`Node not found: ${nodeId}`);
    const affected = await this.traverse({ nodeId, depth });
    const level: ImpactReport["level"] =
      affected.length > 25 ? "critical" : affected.length > 10 ? "high" : affected.length > 3 ? "medium" : "low";
    return {
      target,
      level,
      reasons: [`${affected.length} nodes reachable within depth ${depth}`],
      affected,
      depth,
    };
  },
  async dependenciesOf(nodeId: string): Promise<GraphNode[]> {
    return this.neighbors(nodeId, "imports");
  },
};
