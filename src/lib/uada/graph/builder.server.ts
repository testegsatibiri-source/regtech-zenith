// H13 — Graph Builder. Composes nodes/edges from code + db indexers.
// Enforces "no orphan" invariant unless node is a declared root.
import type { CodeIndex } from "@/lib/uada/indexers/code.server";
import type { DbIndex } from "@/lib/uada/indexers/db.server";

export interface BuiltNode {
  kind: string;
  key: string;
  label: string;
  path?: string;
  metadata: Record<string, unknown>;
}
export interface BuiltEdge {
  fromKey: string;
  toKey: string;
  kind: string;
  metadata?: Record<string, unknown>;
}
export interface BuildResult {
  nodes: BuiltNode[];
  edges: BuiltEdge[];
  orphanCount: number;
}

// Roots that are allowed to have no edges (entry points, top-level docs).
const ROOT_KINDS = new Set(["adr", "root_route"]);

export function buildGraph(code: CodeIndex, db: DbIndex): BuildResult {
  const nodes: BuiltNode[] = [];
  const edges: BuiltEdge[] = [];

  // 1. DB nodes/edges (as-is)
  for (const n of db.nodes) nodes.push({ ...n });
  for (const e of db.edges) edges.push({ fromKey: e.fromKey, toKey: e.toKey, kind: e.kind });

  // 2. Code nodes: one per document.
  const codeNodeKeys = new Set<string>();
  for (const doc of code.documents) {
    const kind = doc.metadata.isRoute
      ? "route"
      : doc.metadata.hasServerFn
        ? "server_fn"
        : doc.kind === "component"
          ? "component"
          : doc.kind;
    const key = `file:${doc.path}`;
    codeNodeKeys.add(key);
    nodes.push({
      kind,
      key,
      label: doc.path,
      path: doc.path,
      metadata: { exports: doc.metadata.exports, defaultExport: doc.metadata.defaultExport },
    });
  }

  // 3. Import edges (best-effort resolve for local imports)
  for (const imp of code.imports) {
    const from = `file:${imp.from}`;
    // Try to resolve @/foo → src/foo, ./bar → sibling
    const resolved = resolveImport(imp.from, imp.to);
    if (!resolved) continue;
    const to = `file:${resolved}`;
    if (!codeNodeKeys.has(to)) continue; // ignore npm packages
    edges.push({ fromKey: from, toKey: to, kind: "imports", metadata: { dynamic: imp.dynamic } });
  }

  // 4. Orphan detection
  const withEdge = new Set<string>();
  for (const e of edges) {
    withEdge.add(e.fromKey);
    withEdge.add(e.toKey);
  }
  let orphanCount = 0;
  for (const n of nodes) {
    if (ROOT_KINDS.has(n.kind)) continue;
    if (!withEdge.has(n.key)) orphanCount++;
  }

  return { nodes, edges, orphanCount };
}

function resolveImport(fromFile: string, spec: string): string | null {
  const exts = [".ts", ".tsx", "/index.ts", "/index.tsx"];
  const tryPaths = (base: string) => {
    if (base.endsWith(".ts") || base.endsWith(".tsx")) return [base];
    return exts.map((e) => `${base}${e}`);
  };
  if (spec.startsWith("@/")) {
    const base = `src/${spec.slice(2)}`;
    return tryPaths(base)[0]; // caller checks presence
  }
  if (spec.startsWith(".")) {
    const parts = fromFile.split("/");
    parts.pop();
    const segs = spec.split("/");
    for (const seg of segs) {
      if (seg === ".") continue;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    }
    return tryPaths(parts.join("/"))[0];
  }
  return null;
}
