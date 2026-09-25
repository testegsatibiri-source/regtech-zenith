import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateAssurance, evaluationHash } from "../engine";
import { PH_EVIDENCE, PH_GAPS, PH_GATES, evaluatePh } from "../registers/ph";
import { philippinesPack } from "@/packs/philippines";

const AT = "2026-09-25T00:00:00.000Z";

describe("PH assurance evaluation", () => {
  it("produces the expected gate statuses today", () => {
    const ev = evaluatePh(AT);
    const map = Object.fromEntries(ev.gates.map((g) => [g.gate, g.status]));
    expect(map).toEqual({ H20: "CONDITIONAL", H21: "FAIL", H22: "FAIL", H23: "FAIL", H24: "CONDITIONAL" });
    expect(ev.commercialReady).toBe(false);
    expect(ev.maturity).toBe("VALIDATED_PILOT");
  });

  it("manifest.commercialReady matches the engine (no self-declaration)", () => {
    expect(philippinesPack.manifest.commercialReady ?? false).toBe(evaluatePh(AT).commercialReady);
  });

  it("is deterministic (same input → same hash)", async () => {
    expect(await evaluationHash(evaluatePh(AT))).toBe(await evaluationHash(evaluatePh(AT)));
  });

  it("commercialReady only when every gate PASSes", () => {
    const evidence = PH_EVIDENCE.map((e) => ({ ...e, layer: "PRODUCTION" as const, status: "VERIFIED" as const }));
    const gaps = PH_GAPS.map((g) => ({ ...g, state: "CLOSED" as const }));
    const all = evaluateAssurance({ country: "PH", registerVersion: "t", evidence, gaps, definitions: PH_GATES, evaluatedAt: AT });
    expect(all.commercialReady).toBe(true);
    const oneOpen = evaluateAssurance({ country: "PH", registerVersion: "t", evidence, gaps: gaps.map((g, i) => (i === 5 ? { ...g, state: "OPEN" as const } : g)), definitions: PH_GATES, evaluatedAt: AT });
    expect(oneOpen.commercialReady).toBe(false);
  });

  it("non-inference: TEST layer never satisfies REGULATORY requirement", () => {
    const gaps = PH_GAPS.map((g) => ({ ...g, state: "CLOSED" as const }));
    const r = evaluateAssurance({ country: "PH", registerVersion: "t", evidence: PH_EVIDENCE, gaps, definitions: PH_GATES, evaluatedAt: AT });
    expect(r.gates.find((g) => g.gate === "H20")!.status).toBe("CONDITIONAL");
  });

  it("expired or FAILED evidence fails the gate", () => {
    const expired = evaluatePh("2028-01-01T00:00:00.000Z");
    expect(expired.gates.every((g) => g.status === "FAIL")).toBe(true);
    const failed = PH_EVIDENCE.map((e) => (e.evidenceId === "EV-PH-SECURITY-001" ? { ...e, status: "FAILED" as const } : e));
    const r = evaluateAssurance({ country: "PH", registerVersion: "t", evidence: failed, gaps: PH_GAPS, definitions: PH_GATES, evaluatedAt: AT });
    expect(r.gates.find((g) => g.gate === "H24")!.status).toBe("FAIL");
  });

  it("human-readable register lists every EV/GAP id", () => {
    const doc = readFileSync("docs/governance/evidence-register/PH-evidence-register-v1.0.md", "utf8");
    for (const id of [...PH_EVIDENCE.map((e) => e.evidenceId), ...PH_GAPS.map((g) => g.gapId)]) {
      expect(doc).toContain(id);
    }
  });
});
