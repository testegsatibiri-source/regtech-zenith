// H15 — Deterministic architecture rules (ADR-0030).
// Pure functions over a ParsedDiff. Same diff => byte-identical findings.
import type { ReviewFinding } from "@/lib/uada/contracts/review";
import type { DiffFile, ParsedDiff } from "@/lib/uada/review/diff";

export interface RuleDescriptor {
  id: string;
  title: string;
  references: string[];
  evaluate(diff: ParsedDiff): ReviewFinding[];
}

const PII_TABLES = [
  "payroll_items",
  "payroll_runs",
  "employees",
  "employment_contracts",
  "profiles",
];

function isUada(path: string): boolean {
  return (
    path.startsWith("src/lib/uada/") ||
    path.startsWith("src/routes/platform/uada") ||
    path.startsWith("src/routes/api/uada/") ||
    path.startsWith("src/components/uada/")
  );
}

function isPack(path: string): boolean {
  return path.startsWith("src/packs/");
}

function eachAdded(
  diff: ParsedDiff,
  fn: (file: DiffFile, line: number | undefined, content: string) => void,
): void {
  for (const file of diff.files) {
    if (file.status === "deleted") continue;
    for (const l of file.added) fn(file, l.line, l.content);
  }
}

function finding(
  partial: Omit<ReviewFinding, "origin">,
): ReviewFinding {
  return { origin: "rule", ...partial };
}

const RULES: RuleDescriptor[] = [
  {
    id: "ARCH-001",
    title: "UADA boundary violation",
    references: ["ADR-0020"],
    evaluate(diff) {
      const out: ReviewFinding[] = [];
      eachAdded(diff, (file, line, content) => {
        if (isUada(file.path)) return;
        if (/from\s+["']@\/lib\/uada\//.test(content) || /import\(["']@\/lib\/uada\//.test(content)) {
          out.push(
            finding({
              id: "ARCH-001",
              severity: "error",
              title: "Non-UADA file imports from src/lib/uada",
              detail: `${file.path} imports UADA internals. Only src/lib/uada/** may import UADA modules.`,
              path: file.path,
              line,
              references: ["ADR-0020"],
              suggestion: "Expose the behaviour through a UADA server function instead of importing internals.",
            }),
          );
        }
      });
      return out;
    },
  },
  {
    id: "ARCH-002",
    title: "Engine bypasses ContextAssembler",
    references: ["ADR-0029"],
    evaluate(diff) {
      const out: ReviewFinding[] = [];
      eachAdded(diff, (file, line, content) => {
        if (!file.path.startsWith("src/lib/uada/engines/")) return;
        if (/@\/lib\/uada\/stores\//.test(content)) {
          out.push(
            finding({
              id: "ARCH-002",
              severity: "error",
              title: "Engine reads a store directly",
              detail: `${file.path} imports a store. ContextAssembler is the only component allowed to read KnowledgeStore/GraphStore/MemoryStore.`,
              path: file.path,
              line,
              references: ["ADR-0029"],
              suggestion: "Compose a ContextRequest and consume the returned ContextBundle.",
            }),
          );
        }
      });
      return out;
    },
  },
  {
    id: "ARCH-003",
    title: "Engine calls the AI Gateway directly",
    references: ["ADR-0029"],
    evaluate(diff) {
      const out: ReviewFinding[] = [];
      eachAdded(diff, (file, line, content) => {
        if (!file.path.startsWith("src/lib/uada/engines/")) return;
        if (/@\/lib\/uada\/gateway\//.test(content) || /@\/lib\/uada\/model\/router/.test(content)) {
          out.push(
            finding({
              id: "ARCH-003",
              severity: "error",
              title: "Engine bypasses InferenceService",
              detail: `${file.path} touches the gateway or ModelRouter. Inference must go through InferenceService.`,
              path: file.path,
              line,
              references: ["ADR-0029"],
              suggestion: "Call InferenceService with a ContextBundle.",
            }),
          );
        }
      });
      return out;
    },
  },
  {
    id: "ARCH-004",
    title: "UADA touches PII tables",
    references: ["ADR-0020"],
    evaluate(diff) {
      const out: ReviewFinding[] = [];
      eachAdded(diff, (file, line, content) => {
        if (!isUada(file.path)) return;
        for (const t of PII_TABLES) {
          if (new RegExp(`["'\`]${t}["'\`]`).test(content)) {
            out.push(
              finding({
                id: "ARCH-004",
                severity: "error",
                title: `UADA references PII table ${t}`,
                detail: `${file.path} references ${t}. UADA may read structural metadata only, never customer PII.`,
                path: file.path,
                line,
                references: ["ADR-0020"],
                suggestion: "Use schema/structural metadata from the indexers instead of the data table.",
              }),
            );
          }
        }
      });
      return out;
    },
  },
  {
    id: "ARCH-005",
    title: "Country pack imports Core",
    references: ["ADR-0003", "ADR-0018"],
    evaluate(diff) {
      const out: ReviewFinding[] = [];
      eachAdded(diff, (file, line, content) => {
        if (!isPack(file.path)) return;
        const m = content.match(/from\s+["'](@\/lib\/(?:engines|platform|uada)\/[^"']+)["']/);
        if (m) {
          out.push(
            finding({
              id: "ARCH-005",
              severity: "error",
              title: "Country pack imports Core internals",
              detail: `${file.path} imports ${m[1]}. Packs may only depend on src/sdk/** and their own tree.`,
              path: file.path,
              line,
              references: ["ADR-0003", "ADR-0018"],
              suggestion: "Receive the dependency through ProviderContext (DI) instead.",
            }),
          );
        }
      });
      return out;
    },
  },
  {
    id: "ARCH-006",
    title: "New public table without GRANT",
    references: ["ADR-0009"],
    evaluate(diff) {
      const out: ReviewFinding[] = [];
      for (const file of diff.files) {
        if (!/\.sql$/.test(file.path)) continue;
        const body = file.added.map((l) => l.content).join("\n");
        const created = Array.from(body.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi));
        for (const c of created) {
          const table = c[1];
          const granted = new RegExp(`grant[\\s\\S]*?on\\s+(?:table\\s+)?public\\.${table}\\b`, "i").test(body);
          const rls = new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(body);
          if (!granted) {
            out.push(
              finding({
                id: "ARCH-006",
                severity: "error",
                title: `public.${table} created without GRANT`,
                detail: "PostgREST needs explicit GRANTs; RLS alone leaves the table unreachable.",
                path: file.path,
                references: ["ADR-0009"],
                suggestion: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.${table} TO authenticated;`,
              }),
            );
          }
          if (!rls) {
            out.push(
              finding({
                id: "ARCH-006",
                severity: "error",
                title: `public.${table} created without RLS`,
                detail: "Every public table must enable row level security in the same migration.",
                path: file.path,
                references: ["ADR-0009"],
                suggestion: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`,
              }),
            );
          }
        }
      }
      return out;
    },
  },
  {
    id: "ARCH-007",
    title: "Frozen surface changed without an ADR",
    references: ["architecture-freeze", "ADR-0018"],
    evaluate(diff) {
      const frozen = diff.files.filter(
        (f) =>
          f.path.startsWith("src/sdk/") ||
          f.path === "src/sdk/INTERFACE_VERSION.ts" ||
          f.path.startsWith("src/lib/uada/contracts/"),
      );
      if (frozen.length === 0) return [];
      const hasAdr = diff.files.some((f) => /^docs\/(adr|governance)\/.+\.md$/.test(f.path));
      if (hasAdr) return [];
      return frozen.map((f) =>
        finding({
          id: "ARCH-007",
          severity: "warning",
          title: "Frozen contract changed without an accompanying ADR",
          detail: `${f.path} is part of a frozen surface. Architectural changes require an ADR in the same change set.`,
          path: f.path,
          references: ["architecture-freeze", "ADR-0018"],
          suggestion: "Add docs/adr/ADR-XXXX-*.md describing the decision.",
        }),
      );
    },
  },
  {
    id: "ARCH-008",
    title: "Unauthenticated UADA server function",
    references: ["ADR-0020", "ADR-0011"],
    evaluate(diff) {
      const out: ReviewFinding[] = [];
      for (const file of diff.files) {
        if (!/uada.*\.functions\.tsx?$/.test(file.path)) continue;
        const body = file.added.map((l) => l.content).join("\n");
        if (/createServerFn\(/.test(body) && !/requireSupabaseAuth/.test(body)) {
          out.push(
            finding({
              id: "ARCH-008",
              severity: "error",
              title: "UADA server function without auth middleware",
              detail: `${file.path} declares a server function without requireSupabaseAuth. UADA surfaces are platform-restricted.`,
              path: file.path,
              references: ["ADR-0020", "ADR-0011"],
              suggestion: "Add .middleware([requireSupabaseAuth]) and a platform role assertion.",
            }),
          );
        }
      }
      return out;
    },
  },
];

export const ReviewRules = {
  list(): Array<Pick<RuleDescriptor, "id" | "title" | "references">> {
    return RULES.map(({ id, title, references }) => ({ id, title, references }));
  },
  ids(): string[] {
    return RULES.map((r) => r.id);
  },
  run(diff: ParsedDiff): ReviewFinding[] {
    const found = RULES.flatMap((r) => r.evaluate(diff));
    // Stable total ordering: severity desc, then rule id, then path, then line.
    const weight = { error: 0, warning: 1, info: 2 } as const;
    return found.sort(
      (a, b) =>
        weight[a.severity] - weight[b.severity] ||
        a.id.localeCompare(b.id) ||
        a.path.localeCompare(b.path) ||
        (a.line ?? 0) - (b.line ?? 0) ||
        a.title.localeCompare(b.title),
    );
  },
};
