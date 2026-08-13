// H16 — Architecture Score & tool binding tests. Pure and deterministic.
import { describe, it, expect } from "vitest";
import {
  SCORE_DIMENSIONS,
  SCORE_WEIGHTS,
  assertScoreReport,
  computeOverall,
  roundScore,
} from "@/lib/uada/contracts/score";
import { SCORE_REPORT_EXAMPLE } from "@/lib/uada/contracts/score/examples";
import type { ArchitectureFacts } from "@/lib/uada/contracts/score/facts";
import { computeDimensions, computeScoreReport, layerOf } from "@/lib/uada/score/dimensions";
import { CapabilityRegistry } from "@/lib/uada/capabilities/CapabilityRegistry";

function facts(overrides: Partial<ArchitectureFacts> = {}): ArchitectureFacts {
  return {
    snapshotId: "00000000-0000-0000-0000-000000000001",
    snapshotVersion: 7,
    snapshotCreatedAt: "2026-07-30T00:00:00.000Z",
    now: "2026-07-31T00:00:00.000Z",
    nodes: [
      { id: "a", kind: "file", label: "core", path: "src/lib/compliance.ts", metadata: {} },
      { id: "b", kind: "file", label: "pack", path: "src/packs/indonesia/tax.ts", metadata: {} },
      { id: "c", kind: "file", label: "sdk", path: "src/sdk/runtime.ts", metadata: {} },
    ],
    edges: [
      { fromId: "b", toId: "c", kind: "imports" },
      { fromId: "a", toId: "a", kind: "imports" },
    ],
    documents: [
      { path: "docs/adr/ADR-0001.md", kind: "adr", hasSummary: true, updatedAt: "" },
      { path: "src/sdk/runtime.ts", kind: "code", hasSummary: true, updatedAt: "" },
      { path: "src/sdk/__tests__/runtime.test.ts", kind: "code", hasSummary: true, updatedAt: "" },
    ],
    embeddings: { ready: 10, failed: 0, pending: 0 },
    regulatory: [],
    ...overrides,
  };
}


describe("H16 — score contract freeze", () => {
  it("weights sum to exactly 1", () => {
    const total = SCORE_DIMENSIONS.reduce((s, d) => s + SCORE_WEIGHTS[d], 0);
    expect(roundScore(total)).toBe(1);
  });

  it("the frozen example is a valid report", () => {
    expect(() => assertScoreReport(SCORE_REPORT_EXAMPLE)).not.toThrow();
    expect(SCORE_REPORT_EXAMPLE.dimensions.map((d) => d.name)).toEqual([...SCORE_DIMENSIONS]);
  });

  it("example overall matches the weighted mean of its dimensions", () => {
    expect(computeOverall(SCORE_REPORT_EXAMPLE.dimensions)).toBe(83.125);
  });


  it("rejects a drifted weight", () => {
    expect(() =>
      assertScoreReport({
        ...SCORE_REPORT_EXAMPLE,
        dimensions: [{ name: "coupling", score: 50, weight: 0.9, evidence: [] }],
      }),
    ).toThrow(/weight drifted/);
  });

  it("rejects duplicate dimensions", () => {
    expect(() =>
      assertScoreReport({
        snapshot: "v1",
        overall: 10,
        dimensions: [
          { name: "coupling", score: 10, weight: 0.25, evidence: [] },
          { name: "coupling", score: 20, weight: 0.25, evidence: [] },
        ],
      }),
    ).toThrow(/duplicate dimension/);
  });
});

describe("H16 — layer classification", () => {
  it("maps paths to architectural layers", () => {
    expect(layerOf("src/packs/indonesia/tax.ts")).toBe("pack");
    expect(layerOf("src/sdk/runtime.ts")).toBe("sdk");
    expect(layerOf("src/lib/uada/engines/plan.server.ts")).toBe("uada");
    expect(layerOf("src/lib/platform/packs.ts")).toBe("platform");
    expect(layerOf("src/components/uada/UadaConsole.tsx")).toBe("ui");
    expect(layerOf("src/lib/compliance.ts")).toBe("core");
    expect(layerOf(undefined)).toBe("other");
  });
});

describe("H16 — dimensions", () => {
  it("is deterministic for identical facts", () => {
    expect(JSON.stringify(computeDimensions(facts()))).toBe(
      JSON.stringify(computeDimensions(facts())),
    );
  });

  it("produces one entry per frozen dimension, in order", () => {
    expect(computeDimensions(facts()).map((d) => d.name)).toEqual([...SCORE_DIMENSIONS]);
  });

  it("penalises cross-boundary coupling", () => {
    const clean = computeDimensions(
      facts({ edges: [{ fromId: "a", toId: "a", kind: "imports" }] }),
    ).find((d) => d.name === "coupling")!;
    const dirty = computeDimensions(
      facts({ edges: [{ fromId: "b", toId: "a", kind: "imports" }] }),
    ).find((d) => d.name === "coupling")!;
    expect(clean.score).toBe(100);
    expect(dirty.score).toBe(0);
    expect(dirty.evidence[0]).toContain("cross-boundary");
  });

  it("flags illegal pack -> core imports in boundary integrity", () => {
    const d = computeDimensions(
      facts({ edges: [{ fromId: "b", toId: "a", kind: "imports" }] }),
    ).find((x) => x.name === "boundary_integrity")!;
    expect(d.score).toBe(90);
    expect(d.evidence.join(" ")).toContain("pack importing core internals");
  });

  it("reports zero violations for a clean graph", () => {
    const d = computeDimensions(facts()).find((x) => x.name === "boundary_integrity")!;
    expect(d.score).toBe(100);
    expect(d.evidence).toEqual(["0 boundary violations"]);
  });

  it("decays freshness with snapshot age", () => {
    const fresh = computeDimensions(facts()).find((d) => d.name === "knowledge_freshness")!;
    const stale = computeDimensions(
      facts({ snapshotCreatedAt: "2026-01-01T00:00:00.000Z" }),
    ).find((d) => d.name === "knowledge_freshness")!;
    expect(fresh.score).toBe(100);
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it("punishes failed embeddings", () => {
    const d = computeDimensions(facts({ embeddings: { ready: 0, failed: 10, pending: 0 } })).find(
      (x) => x.name === "knowledge_freshness",
    )!;
    expect(d.score).toBe(50);
    expect(d.evidence.join(" ")).toContain("10 document(s) with failed embeddings");
  });

  it("keeps every score inside 0..100", () => {
    for (const d of computeDimensions(facts({ nodes: [], edges: [], documents: [] }))) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("H16 — report assembly", () => {
  it("labels the snapshot and validates against the contract", () => {
    const report = computeScoreReport(facts());
    expect(report.snapshot).toBe("v7");
    expect(() => assertScoreReport(report)).not.toThrow();
    expect(report.previousOverall).toBeUndefined();
    expect(report.delta).toBeUndefined();
  });

  it("computes the delta against a previous overall", () => {
    const report = computeScoreReport(facts(), 50);
    expect(report.previousOverall).toBe(50);
    expect(report.delta).toBe(roundScore(report.overall - 50));
  });

  it("overall equals the weighted mean", () => {
    const report = computeScoreReport(facts());
    expect(report.overall).toBe(computeOverall(report.dimensions));
  });
});

describe("H16 — capability catalog", () => {
  it("declares the score capability with the frozen output shape", () => {
    const desc = CapabilityRegistry.get("score");
    expect(desc?.outputSchema).toEqual({ report: "ScoreReport" });
  });
});
