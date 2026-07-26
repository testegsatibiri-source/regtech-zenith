// H13 — Code indexer using the TypeScript Compiler API (refinement 5).
// Extracts imports (static, dynamic, lazy), default exports, JSX component
// references. Produces documents + graph fragments per source file.
// Server-only. Consumes the pre-baked manifest (Vite import.meta.glob).
import ts from "typescript";
import { collectManifest, type ManifestEntry } from "./manifest";

export interface CodeDoc {
  path: string;
  kind: "code" | "route" | "component" | "hook" | "provider" | "service" | "context";
  sha256Input: string; // raw content — indexer computes hash separately
  summary: string;
  metadata: {
    imports: string[];
    dynamicImports: string[];
    defaultExport: boolean;
    exports: string[];
    isRoute: boolean;
    hasServerFn: boolean;
    componentRefs: string[];
  };
}

export interface CodeIndex {
  documents: CodeDoc[];
  // Graph fragments: (from path) → array of (imported specifier)
  imports: Array<{ from: string; to: string; dynamic: boolean }>;
}

function classifyKind(entry: ManifestEntry): CodeDoc["kind"] {
  switch (entry.kind) {
    case "route":
    case "component":
    case "hook":
    case "provider":
    case "service":
    case "context":
      return entry.kind;
    default:
      return "code";
  }
}

function extractFromSourceFile(sf: ts.SourceFile) {
  const imports: string[] = [];
  const dynamicImports: string[] = [];
  const exports: string[] = [];
  const componentRefs = new Set<string>();
  let defaultExport = false;
  let hasServerFn = false;

  function visit(node: ts.Node) {
    // static: import x from "y"
    if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier;
      if (ts.isStringLiteral(spec)) imports.push(spec.text);
    }
    // dynamic: import("y")
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      dynamicImports.push((node.arguments[0] as ts.StringLiteral).text);
    }
    // React.lazy(() => import("y"))  — captured by the dynamic branch above too.
    // export default …
    if (ts.isExportAssignment(node) && !node.isExportEquals) defaultExport = true;
    if (ts.isExportDeclaration(node)) {
      // export { A, B } / export * from "…"
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) exports.push(el.name.text);
      }
    }
    if (
      ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (ts.isFunctionDeclaration(node) && node.name) exports.push(node.name.text);
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) exports.push(decl.name.text);
        }
      }
      if (ts.isClassDeclaration(node) && node.name) exports.push(node.name.text);
    }
    // JSX component references (PascalCase opening tags)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName;
      if (ts.isIdentifier(tagName) && /^[A-Z]/.test(tagName.text)) {
        componentRefs.add(tagName.text);
      }
    }
    // createServerFn(...) usage
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "createServerFn"
    ) {
      hasServerFn = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  return { imports, dynamicImports, exports, defaultExport, hasServerFn, componentRefs: [...componentRefs] };
}

export function indexCode(): CodeIndex {
  const documents: CodeDoc[] = [];
  const importsList: CodeIndex["imports"] = [];

  const entries = collectManifest().filter(
    (e) => e.path.startsWith("src/") && (e.path.endsWith(".ts") || e.path.endsWith(".tsx")),
  );

  for (const entry of entries) {
    let sf: ts.SourceFile;
    try {
      sf = ts.createSourceFile(entry.path, entry.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    } catch {
      continue;
    }
    const parsed = extractFromSourceFile(sf);
    const kind = classifyKind(entry);
    const isRoute = entry.path.startsWith("src/routes/");

    documents.push({
      path: entry.path,
      kind,
      sha256Input: entry.content,
      summary: firstNonBlankLine(entry.content, 200),
      metadata: {
        imports: parsed.imports,
        dynamicImports: parsed.dynamicImports,
        defaultExport: parsed.defaultExport,
        exports: parsed.exports,
        isRoute,
        hasServerFn: parsed.hasServerFn,
        componentRefs: parsed.componentRefs,
      },
    });

    for (const to of parsed.imports) importsList.push({ from: entry.path, to, dynamic: false });
    for (const to of parsed.dynamicImports) importsList.push({ from: entry.path, to, dynamic: true });
  }

  return { documents, imports: importsList };
}

function firstNonBlankLine(content: string, max: number): string {
  const line = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.trim().slice(0, max);
}
