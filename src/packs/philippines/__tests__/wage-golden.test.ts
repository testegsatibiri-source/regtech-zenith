// H24 — golden test. The wage-region shape change (scalar → regional array)
// must not alter any computed value. Expectations are hardcoded from the
// pre-refactor behavior so a regression in the refactor fails here.
import { describe, expect, it } from "vitest";
import { philippinesPack } from "../index";
import { PH_PARAMS, phMinWageMonthlyFloor } from "../params";

describe("PH NCR minimum wage golden values (unchanged by H24)", () => {
  it("monthly floor is ₱610/day × 22 days = ₱13,420", () => {
    expect(phMinWageMonthlyFloor("NCR")).toBe(13_420);
    expect(phMinWageMonthlyFloor()).toBe(13_420);
  });

  it("PH-DOLE-MINWAGE boundary is unchanged", () => {
    const rule = philippinesPack.providers
      .rules!.rules()
      .find((r) => r.code === "PH-DOLE-MINWAGE")!;
    const evaluate = (salary: number) =>
      rule.evaluate({ base_salary: salary } as never, PH_PARAMS as never);
    expect(evaluate(13_419).passed).toBe(false);
    expect(evaluate(13_420).passed).toBe(true);
    expect(evaluate(30_000).passed).toBe(true);
  });

  it("PH-WO-NCR-MINWAGE boundary is unchanged", () => {
    const heuristic = philippinesPack.providers
      .audit!.heuristics()
      .find((h) => h.code === "PH-WO-NCR-MINWAGE")!;
    const below = heuristic.evaluate({
      employees: [{ base_salary: 13_419 }],
      company: {},
    } as never);
    expect(below.passed).toBe(false);
    const atFloor = heuristic.evaluate({
      employees: [{ base_salary: 13_420 }],
      company: {},
    } as never);
    expect(atFloor.passed).toBe(true);
    expect(heuristic.evaluate({ employees: [], company: {} } as never).passed).toBe(true);
  });
});
