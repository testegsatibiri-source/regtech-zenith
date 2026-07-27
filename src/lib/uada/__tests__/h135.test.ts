// H13.5 — Evidence hash + guard tests.
import { describe, expect, it } from "vitest";
import {
  computeEvidenceHash,
  evidencePreimage,
  assertEvidenceComplete,
} from "@/lib/uada/contracts/response/hash";
import type { Evidence } from "@/lib/uada/contracts/response";
import {
  GRAPH_SCHEMA_VERSION,
  GRAPH_SCHEMA_KINDS_V1,
} from "@/lib/uada/contracts/graph/version";

async function mk(over: Partial<Evidence> = {}): Promise<Evidence> {
  const base = {
    source: "code" as const,
    path: "src/x.ts",
    score: 0.9,
    snapshotVersion: 3,
    snippet: "hello",
  };
  const merged = { ...base, ...over };
  const evidenceHash = await computeEvidenceHash(merged);
  return { ...merged, evidenceHash };
}

describe("H13.5 evidence hash", () => {
  it("hash is deterministic for canonical preimage", async () => {
    const e = { path: "a.ts", score: 0.5, snapshotVersion: 1, snippet: "x" };
    expect(evidencePreimage(e)).toBe("a.ts|0.5|1|x");
    const h1 = await computeEvidenceHash(e);
    const h2 = await computeEvidenceHash(e);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("guard accepts valid evidence", async () => {
    const e = await mk();
    await expect(
      assertEvidenceComplete({ confidence: 0.8, evidence: [e] }),
    ).resolves.toBeUndefined();
  });

  it("guard rejects hash mismatch", async () => {
    const e = await mk();
    const tampered: Evidence = { ...e, path: "src/y.ts" };
    await expect(
      assertEvidenceComplete({ confidence: 0.8, evidence: [tampered] }),
    ).rejects.toThrow(/hash mismatch/);
  });

  it("guard rejects missing evidenceHash", async () => {
    const e = await mk();
    const broken = { ...e, evidenceHash: "" } as Evidence;
    await expect(
      assertEvidenceComplete({ confidence: 0.8, evidence: [broken] }),
    ).rejects.toThrow(/missing evidenceHash/);
  });

  it("guard forbids confidence > 0 with no evidence", async () => {
    await expect(
      assertEvidenceComplete({ confidence: 0.5, evidence: [] }),
    ).rejects.toThrow(/requires at least/);
  });

  it("guard rejects confidence out of range", async () => {
    await expect(
      assertEvidenceComplete({ confidence: 1.5, evidence: [] }),
    ).rejects.toThrow(/out of range/);
  });
});

describe("H13.5 graph schema policy", () => {
  it("exposes v1 with the frozen kind set", () => {
    expect(GRAPH_SCHEMA_VERSION).toBe("v1");
    expect(GRAPH_SCHEMA_KINDS_V1).toContain("table");
    expect(GRAPH_SCHEMA_KINDS_V1).toContain("server_fn");
    expect(GRAPH_SCHEMA_KINDS_V1).toContain("migration");
    expect(GRAPH_SCHEMA_KINDS_V1.length).toBeGreaterThanOrEqual(13);
  });
});
