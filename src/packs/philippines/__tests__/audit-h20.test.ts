// H20 — Philippines pack audit remediation invariants.
import { describe, expect, it } from "vitest";
import { philippinesPack } from "../index";
import { PH_PARAMS } from "../params";
import { calculatePhTax } from "../engines/tax";

describe("PH tax bracket continuity", () => {
  it("has no gap between published brackets", () => {
    // The BIR table leaves 1-peso gaps (e.g. 33,332 -> 33,333); a fractional
    // gross inside the gap must still land in the lower bracket.
    for (const gross of [20_833, 20_833.5, 33_332.5, 66_666.5, 166_666.5, 666_666.5]) {
      expect(() => calculatePhTax({ monthlyGross: gross, maritalStatus: "single", hasNpwp: true })).not.toThrow();
    }
  });

  it("is monotonically non-decreasing across the table", () => {
    let prev = -1;
    for (let gross = 0; gross <= 800_000; gross += 373) {
      const { tax } = calculatePhTax({ monthlyGross: gross, maritalStatus: "single", hasNpwp: true });
      expect(tax).toBeGreaterThanOrEqual(prev);
      prev = tax;
    }
  });

  it("exempts income at or below the zero bracket", () => {
    expect(calculatePhTax({ monthlyGross: 20_833, maritalStatus: "single", hasNpwp: true }).tax).toBe(0);
    expect(calculatePhTax({ monthlyGross: 20_834, maritalStatus: "single", hasNpwp: true }).tax).toBeGreaterThan(0);
  });
});

describe("PH pack manifest & health", () => {
  it("only declares languages that ship translated copy", () => {
    expect(philippinesPack.manifest.supportedLanguages).toEqual(["en"]);
  });

  it("declares the payroll lifecycle events", () => {
    expect(philippinesPack.manifest.events?.emits).toContain("PayrollFinalized@1");
  });

  it("health covers every declared engine capability", () => {
    const report = philippinesPack.health!();
    const names = report.checks.map((c) => c.name);
    for (const engine of ["tax", "benefits", "thirteenth", "contracts"]) {
      expect(names).toContain(`${engine}.calculate.smoke`.replace("contracts.calculate", "contracts.validate"));
    }
    expect(report.status).toBe("ok");
  });
});

describe("PH audit heuristics are data-driven", () => {
  const heuristics = philippinesPack.providers.audit!.heuristics();

  it("has no always-passing placeholder control", () => {
    const floor = PH_PARAMS.minWageNCRDaily * PH_PARAMS.workingDaysPerMonth;
    const h = heuristics.find((x) => x.code === "PH-WO-NCR-MINWAGE")!;
    expect(h).toBeDefined();
    const failing = h.evaluate({
      employees: [{ base_salary: floor - 1 }],
      company: {},
    } as never);
    expect(failing.passed).toBe(false);
    const passing = h.evaluate({
      employees: [{ base_salary: floor }],
      company: {},
    } as never);
    expect(passing.passed).toBe(true);
  });
});
