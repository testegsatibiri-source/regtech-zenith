// H12.5 — CapabilityRegistry: WHAT UADA can do. Bindings to HOW live in
// ToolRegistry. The Orchestrator (H19) queries both.

export type CapabilityId =
  | "search"
  | "plan"
  | "review"
  | "audit"
  | "impact"
  | "dependencies"
  | "docs"
  | "context"
  | "graph"
  | "score"
  | "capabilities";

export interface CapabilityDescriptor {
  id: CapabilityId;
  version: string;
  summary: string;
  /** JSON-schema-like sketch; enforced by engines at H14+. */
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

const CATALOG: Record<CapabilityId, CapabilityDescriptor> = {
  search: {
    id: "search",
    version: "1.0.0",
    summary: "Semantic search over the Knowledge Store.",
    inputSchema: { text: "string" },
    outputSchema: { hits: "SearchHit[]" },
  },
  plan: {
    id: "plan",
    version: "1.0.0",
    summary: "Produce an implementation plan for an objective.",
    inputSchema: { objective: "string" },
    outputSchema: { steps: "Step[]" },
  },
  review: {
    id: "review",
    version: "1.0.0",
    summary: "Review a diff or PR against Knowledge Base rules.",
    inputSchema: { diff: "string" },
    outputSchema: { findings: "Finding[]" },
  },
  audit: {
    id: "audit",
    version: "1.0.0",
    summary: "Audit code/data against compliance rules.",
    inputSchema: { scope: "string" },
    outputSchema: { findings: "Finding[]" },
  },
  impact: {
    id: "impact",
    version: "1.0.0",
    summary: "Classify blast radius of changing a node.",
    inputSchema: { nodeId: "string" },
    outputSchema: { report: "ImpactReport" },
  },
  dependencies: {
    id: "dependencies",
    version: "1.0.0",
    summary: "List direct dependencies of a node.",
    inputSchema: { nodeId: "string" },
    outputSchema: { nodes: "GraphNode[]" },
  },
  docs: {
    id: "docs",
    version: "1.0.0",
    summary: "Generate/verify documentation from the Snapshot.",
    inputSchema: { target: "string" },
    outputSchema: { markdown: "string" },
  },
  context: {
    id: "context",
    version: "1.0.0",
    summary: "Assemble task context (roadmap + evidence).",
    inputSchema: { task: "string" },
    outputSchema: { context: "ContextBundle" },
  },
  graph: {
    id: "graph",
    version: "1.0.0",
    summary: "Traverse the Graph Store.",
    inputSchema: { query: "TraversalQuery" },
    outputSchema: { nodes: "GraphNode[]" },
  },
  score: {
    id: "score",
    version: "1.0.0",
    summary: "Compute Architecture Score dimensions.",
    inputSchema: { snapshotVersion: "number?" },
    outputSchema: { report: "ScoreReport" },
  },
  capabilities: {
    id: "capabilities",
    version: "1.0.0",
    summary: "List registered capabilities and bindings.",
    inputSchema: {},
    outputSchema: { capabilities: "CapabilityDescriptor[]" },
  },
};

class Registry {
  private readonly items = new Map<CapabilityId, CapabilityDescriptor>(
    Object.entries(CATALOG) as Array<[CapabilityId, CapabilityDescriptor]>,
  );

  register(desc: CapabilityDescriptor): void {
    this.items.set(desc.id, desc);
  }

  get(id: CapabilityId): CapabilityDescriptor | undefined {
    return this.items.get(id);
  }

  list(): CapabilityDescriptor[] {
    return Array.from(this.items.values());
  }

  has(id: CapabilityId): boolean {
    return this.items.has(id);
  }
}

export const CapabilityRegistry = new Registry();
