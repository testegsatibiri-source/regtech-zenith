import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateAssurance, evaluationHash } from "../engine";
import { ID_EVIDENCE, ID_GAPS, ID_GATES, evaluateId } from "../registers/id";
import { PH_EVIDENCE, PH_GAPS, PH_GATES, evaluatePh } from "../registers/ph";
import { indonesiaPack } from "@/packs/indonesia";

const AT = "2026-09-25T00:00:00.000Z";

describe("ID assurance evaluation", () => {
  it("produces the expected gate statuses today", () => {
    const ev = evaluateId(AT);
    const map = Object.fromEntries(ev.gates.map((g) => [g.gate, g.status]));
    expect(map).toEqual({
      H20: "CONDITIONAL",
      H21: "FAIL",
      H22: "FAIL",
      H23: "FAIL",
      H24: "CONDITIONAL",
    });
    expect(ev.commercialReady).toBe(false);
    expect(ev.maturity).toBe("VALIDATED_PILOT");
  });

  it("manifest.commercialReady matches the engine (no self-declaration)", () => {
    expect(indonesiaPack.manifest.commercialReady ?? false).toBe(evaluateId(AT).commercialReady);
  });

  it("is deterministic (same input → same hash)", async () => {
    expect(await evaluationHash(evaluateId(AT))).toBe(await evaluationHash(evaluateId(AT)));
  });

  it("commercialReady only when every ID gate PASSes", () => {
    const evidence = ID_EVIDENCE.map((e) => ({
      ...e,
      layer: "PRODUCTION" as const,
      status: "VERIFIED" as const,
    }));
    const closed = ID_GAPS.map((g) => ({ ...g, state: "CLOSED" as const }));
    const all = evaluateAssurance({
      country: "ID",
      registerVersion: "t",
      evidence,
      gaps: closed,
      definitions: ID_GATES,
      evaluatedAt: AT,
    });
    expect(all.commercialReady).toBe(true);

    const oneOpen = evaluateAssurance({
      country: "ID",
      registerVersion: "t",
      evidence,
      gaps: closed.map((g, i) => (i === 0 ? { ...g, state: "OPEN" as const } : g)),
      definitions: ID_GATES,
      evaluatedAt: AT,
    });
    expect(oneOpen.commercialReady).toBe(false);
  });

  it("PENDING evidence never yields PASS", () => {
    const gaps = ID_GAPS.map((g) => ({ ...g, state: "CLOSED" as const }));
    const r = evaluateAssurance({
      country: "ID",
      registerVersion: "t",
      evidence: ID_EVIDENCE,
      gaps,
      definitions: ID_GATES,
      evaluatedAt: AT,
    });
    expect(r.gates.find((g) => g.gate === "H21")!.status).not.toBe("PASS");
  });

  it("non-inference: TEST layer never satisfies REGULATORY requirement", () => {
    const gaps = ID_GAPS.map((g) => ({ ...g, state: "CLOSED" as const }));
    const r = evaluateAssurance({
      country: "ID",
      registerVersion: "t",
      evidence: ID_EVIDENCE,
      gaps,
      definitions: ID_GATES,
      evaluatedAt: AT,
    });
    expect(r.gates.find((g) => g.gate === "H20")!.status).toBe("CONDITIONAL");
  });

  it("expired evidence fails every gate", () => {
    expect(evaluateId("2028-01-01T00:00:00.000Z").gates.every((g) => g.status === "FAIL")).toBe(
      true,
    );
  });

  it("human-readable register lists every EV/GAP id", () => {
    const doc = readFileSync(
      "docs/governance/evidence-register/ID-evidence-register-v1.0.md",
      "utf8",
    );
    for (const id of [...ID_EVIDENCE.map((e) => e.evidenceId), ...ID_GAPS.map((g) => g.gapId)]) {
      expect(doc).toContain(id);
    }
  });
});

describe("jurisdictional isolation", () => {
  it("ID register contains no PH identifiers and vice versa", () => {
    const idIds = [...ID_EVIDENCE.map((e) => e.evidenceId), ...ID_GAPS.map((g) => g.gapId)];
    const phIds = [...PH_EVIDENCE.map((e) => e.evidenceId), ...PH_GAPS.map((g) => g.gapId)];
    expect(idIds.every((i) => i.startsWith("EV-ID-") || i.startsWith("GAP-ID-"))).toBe(true);
    expect(phIds.every((i) => i.startsWith("EV-PH-") || i.startsWith("GAP-PH-"))).toBe(true);
    expect(idIds.filter((i) => phIds.includes(i))).toEqual([]);
  });

  it("gate definitions only reference their own jurisdiction's records", () => {
    const idRefs = ID_GATES.flatMap((g) => [
      ...g.requires.map((r) => r.evidenceId),
      ...g.blockingGaps.map((b) => b.gapId),
    ]);
    const phRefs = PH_GATES.flatMap((g) => [
      ...g.requires.map((r) => r.evidenceId),
      ...g.blockingGaps.map((b) => b.gapId),
    ]);
    expect(idRefs.every((r) => r.includes("-ID-"))).toBe(true);
    expect(phRefs.every((r) => r.includes("-PH-"))).toBe(true);
  });

  it("closing every ID gap does not make PH commercially ready", () => {
    const evidence = ID_EVIDENCE.map((e) => ({
      ...e,
      layer: "PRODUCTION" as const,
      status: "VERIFIED" as const,
    }));
    evaluateAssurance({
      country: "ID",
      registerVersion: "t",
      evidence,
      gaps: ID_GAPS.map((g) => ({ ...g, state: "CLOSED" as const })),
      definitions: ID_GATES,
      evaluatedAt: AT,
    });
    expect(evaluatePh(AT).commercialReady).toBe(false);
    expect(evaluateId(AT).commercialReady).toBe(false);
  });

  it("each evaluation reports its own country and register version", () => {
    expect(evaluateId(AT).country).toBe("ID");
    expect(evaluatePh(AT).country).toBe("PH");
  });
});
