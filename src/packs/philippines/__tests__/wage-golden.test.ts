// DEBT-031 re-baseline (2026-09-21) — golden test pinning the NCR minimum
// wage to Wage Order NCR-28: ₱755/day non-agriculture × 22 working days.
// The pre-correction pin (₱610 × 22 = ₱13,420, Wage Order NCR-23) is retained
// in docs/governance/legal-opinions/PH-wage-ncr-2026-09-16.md as history.
import { describe, expect, it } from "vitest";
import { philippinesPack } from "../index";
import { PH_PARAMS, phMinWageMonthlyFloor } from "../params";

describe("PH NCR minimum wage golden values (Wage Order NCR-28, eff. 2026-09-26)", () => {
  it("monthly floor is ₱755/day × 22 days = ₱16,610", () => {
    expect(phMinWageMonthlyFloor("NCR")).toBe(16_610);
    expect(phMinWageMonthlyFloor()).toBe(16_610);
  });

  it("PH-DOLE-MINWAGE boundary tracks the NCR-28 floor", () => {
    const rule = philippinesPack.providers
      .rules!.rules()
      .find((r) => r.code === "PH-DOLE-MINWAGE")!;
    const evaluate = (salary: number) =>
      rule.evaluate({ base_salary: salary } as never, PH_PARAMS as never);
    expect(evaluate(16_609).passed).toBe(false);
    expect(evaluate(16_610).passed).toBe(true);
    expect(evaluate(30_000).passed).toBe(true);
  });

  it("PH-WO-NCR-MINWAGE boundary tracks the NCR-28 floor", () => {
    const heuristic = philippinesPack.providers
      .audit!.heuristics()
      .find((h) => h.code === "PH-WO-NCR-MINWAGE")!;
    const below = heuristic.evaluate({
      employees: [{ base_salary: 16_609 }],
      company: {},
    } as never);
    expect(below.passed).toBe(false);
    const atFloor = heuristic.evaluate({
      employees: [{ base_salary: 16_610 }],
      company: {},
    } as never);
    expect(atFloor.passed).toBe(true);
    expect(heuristic.evaluate({ employees: [], company: {} } as never).passed).toBe(true);
  });
});
