// H15 — Review Engine tests (pure: diff parser + deterministic rules).
import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "@/lib/uada/review/diff";
import { ReviewRules } from "@/lib/uada/review/rules";
import { summariseVerdict } from "@/lib/uada/contracts/review";

function diffFor(path: string, lines: string[], opts: { added?: boolean } = {}): string {
  return [
    `diff --git a/${path} b/${path}`,
    ...(opts.added ? [`new file mode 100644`, `--- /dev/null`] : [`--- a/${path}`]),
    `+++ b/${path}`,
    `@@ -0,0 +1,${lines.length} @@`,
    ...lines.map((l) => `+${l}`),
  ].join("\n");
}

describe("H15 diff parser", () => {
  it("extracts files, line numbers and counts", () => {
    const d = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -10,3 +10,4 @@",
      " keep",
      "+added one",
      "-removed one",
      "+added two",
    ].join("\n");
    const parsed = parseUnifiedDiff(d);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].path).toBe("src/a.ts");
    expect(parsed.additions).toBe(2);
    expect(parsed.deletions).toBe(1);
    expect(parsed.files[0].added[0].line).toBe(11);
  });

  it("detects added and deleted files", () => {
    const parsed = parseUnifiedDiff(
      [
        "diff --git a/src/new.ts b/src/new.ts",
        "new file mode 100644",
        "--- /dev/null",
        "+++ b/src/new.ts",
        "@@ -0,0 +1,1 @@",
        "+export const x = 1;",
        "diff --git a/src/old.ts b/src/old.ts",
        "deleted file mode 100644",
        "--- a/src/old.ts",
        "+++ /dev/null",
      ].join("\n"),
    );
    expect(parsed.files.map((f) => f.status)).toEqual(["added", "deleted"]);
  });
});

describe("H15 architecture rules", () => {
  it("ARCH-001 flags non-UADA files importing UADA internals", () => {
    const f = ReviewRules.run(
      parseUnifiedDiff(diffFor("src/routes/index.tsx", ['import { x } from "@/lib/uada/stores/index";'])),
    );
    expect(f.some((x) => x.id === "ARCH-001" && x.severity === "error")).toBe(true);
  });

  it("ARCH-001 does not flag UADA-internal imports", () => {
    const f = ReviewRules.run(
      parseUnifiedDiff(diffFor("src/lib/uada/engines/x.server.ts", ['import { y } from "@/lib/uada/contracts/review";'])),
    );
    expect(f.some((x) => x.id === "ARCH-001")).toBe(false);
  });

  it("ARCH-002 / ARCH-003 flag engines bypassing ContextAssembler and InferenceService", () => {
    const f = ReviewRules.run(
      parseUnifiedDiff(
        diffFor("src/lib/uada/engines/rogue.server.ts", [
          'import { PgKnowledgeStore } from "@/lib/uada/stores/pgKnowledgeStore.server";',
          'import { ModelRouter } from "@/lib/uada/model/router";',
        ]),
      ),
    );
    expect(f.map((x) => x.id)).toEqual(expect.arrayContaining(["ARCH-002", "ARCH-003"]));
  });

  it("ARCH-004 flags UADA referencing PII tables", () => {
    const f = ReviewRules.run(
      parseUnifiedDiff(diffFor("src/lib/uada/indexers/db.server.ts", ['const t = "payroll_items";'])),
    );
    expect(f.some((x) => x.id === "ARCH-004")).toBe(true);
  });

  it("ARCH-005 flags packs importing Core", () => {
    const f = ReviewRules.run(
      parseUnifiedDiff(diffFor("src/packs/vietnam/index.ts", ['import { compliance } from "@/lib/engines/compliance";'])),
    );
    expect(f.some((x) => x.id === "ARCH-005")).toBe(true);
  });

  it("ARCH-005 allows packs importing the SDK", () => {
    const f = ReviewRules.run(
      parseUnifiedDiff(diffFor("src/packs/vietnam/index.ts", ['import type { CountryPack } from "@/sdk/CountryPack";'])),
    );
    expect(f).toHaveLength(0);
  });

  it("ARCH-006 flags a public table without GRANT/RLS", () => {
    const sql = diffFor("supabase/migrations/1_x.sql", [
      "create table public.widgets (id uuid primary key);",
    ]);
    const f = ReviewRules.run(parseUnifiedDiff(sql));
    expect(f.filter((x) => x.id === "ARCH-006")).toHaveLength(2);
  });

  it("ARCH-006 passes when GRANT and RLS are present", () => {
    const sql = diffFor("supabase/migrations/1_x.sql", [
      "create table public.widgets (id uuid primary key);",
      "grant select on public.widgets to authenticated;",
      "alter table public.widgets enable row level security;",
    ]);
    expect(ReviewRules.run(parseUnifiedDiff(sql)).filter((x) => x.id === "ARCH-006")).toHaveLength(0);
  });

  it("ARCH-007 warns on frozen contract change without ADR, clears with one", () => {
    const frozen = diffFor("src/sdk/interfaces.ts", ["export type A = 1;"]);
    expect(ReviewRules.run(parseUnifiedDiff(frozen)).some((x) => x.id === "ARCH-007")).toBe(true);

    const withAdr = `${frozen}\n${diffFor("docs/adr/ADR-0031-x.md", ["# ADR"], { added: true })}`;
    expect(ReviewRules.run(parseUnifiedDiff(withAdr)).some((x) => x.id === "ARCH-007")).toBe(false);
  });

  it("ARCH-008 flags UADA server functions without auth middleware", () => {
    const f = ReviewRules.run(
      parseUnifiedDiff(
        diffFor("src/lib/uada/uada.functions.ts", [
          "export const rogue = createServerFn({ method: \"POST\" }).handler(async () => 1);",
        ]),
      ),
    );
    expect(f.some((x) => x.id === "ARCH-008")).toBe(true);
  });

  it("is deterministic and totally ordered", () => {
    const d = parseUnifiedDiff(
      diffFor("src/lib/uada/engines/rogue.server.ts", [
        'import a from "@/lib/uada/stores/pgGraphStore.server";',
        'import b from "@/lib/uada/gateway/aiGateway.server";',
      ]),
    );
    expect(JSON.stringify(ReviewRules.run(d))).toBe(JSON.stringify(ReviewRules.run(d)));
    expect(ReviewRules.run(d)[0].id <= ReviewRules.run(d)[1].id).toBe(true);
  });

  it("verdict blocks on errors, comments on warnings, approves when clean", () => {
    expect(summariseVerdict([]).decision).toBe("approve");
    expect(
      summariseVerdict([
        { id: "X", origin: "rule", severity: "warning", title: "t", detail: "d", path: "p", references: [] },
      ]).decision,
    ).toBe("comment");
    expect(
      summariseVerdict([
        { id: "X", origin: "rule", severity: "error", title: "t", detail: "d", path: "p", references: [] },
      ]).decision,
    ).toBe("block");
  });
});
