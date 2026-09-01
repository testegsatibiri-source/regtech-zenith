// H21 Phase 2 — statutory identifiers (TIN / SSS / PhilHealth / Pag-IBIG).
import { describe, it, expect } from "vitest";
import { philippinesPack } from "../index";
import {
  validatePhEmployeeIdentifiers,
  validatePhEmployerIdentifiers,
  phFilingReadiness,
} from "../engines/identifiers";

const GOOD_EMPLOYEE = {
  tin: "123-456-789-000",
  sss: "34-1234567-8",
  philhealth: "12-345678901-2",
  pagibig: "1234-5678-9012",
};

describe("PH statutory identifiers", () => {
  it("accepts well-formed employee identifiers and normalizes them", () => {
    const v = validatePhEmployeeIdentifiers(GOOD_EMPLOYEE);
    expect(v.complete).toBe(true);
    expect(v.issues).toHaveLength(0);
    expect(v.normalized.sss).toBe("34-1234567-8");
    expect(v.normalized.pagibig).toBe("1234-5678-9012");
  });

  it("accepts a 9-digit TIN without branch code", () => {
    const v = validatePhEmployeeIdentifiers({ ...GOOD_EMPLOYEE, tin: "123456789" });
    expect(v.complete).toBe(true);
    expect(v.normalized.tin).toBe("123-456-789");
  });

  it("flags missing identifiers as missing, not invalid", () => {
    const v = validatePhEmployeeIdentifiers({ tin: GOOD_EMPLOYEE.tin });
    expect(v.complete).toBe(false);
    expect(v.valid).toBe(true);
    expect(v.issues.map((i) => i.key).sort()).toEqual(["pagibig", "philhealth", "sss"]);
  });

  it("rejects wrong digit lengths", () => {
    const v = validatePhEmployeeIdentifiers({ ...GOOD_EMPLOYEE, sss: "34-12345-6" });
    expect(v.valid).toBe(false);
    expect(v.issues[0]).toMatchObject({ key: "sss", reason: "invalid" });
  });

  it("validates employer registry including the RDO code", () => {
    const ok = validatePhEmployerIdentifiers({
      tin: "001-002-003-004",
      rdo: "050",
      sss: "0312345678",
      philhealth: "012345678901",
      pagibig: "111122223333",
    });
    expect(ok.complete).toBe(true);
    const bad = validatePhEmployerIdentifiers({ tin: "001-002-003-004", rdo: "5" });
    expect(bad.complete).toBe(false);
    expect(bad.issues.find((i) => i.key === "rdo")?.reason).toBe("invalid");
  });

  it("filing readiness requires employer + every employee", () => {
    const employer = {
      tin: "001002003004",
      rdo: "050",
      sss: "0312345678",
      philhealth: "012345678901",
      pagibig: "111122223333",
    };
    expect(
      phFilingReadiness({
        employer,
        employees: [{ country_metadata: GOOD_EMPLOYEE }],
      }).ready,
    ).toBe(true);

    const partial = phFilingReadiness({
      employer,
      employees: [{ country_metadata: GOOD_EMPLOYEE }, { country_metadata: { tin: "123456789" } }],
    });
    expect(partial.ready).toBe(false);
    expect(partial.employeesMissing).toBe(1);
  });

  it("exposes PH-STAT-IDS as a scored compliance rule", () => {
    const rule = philippinesPack.providers.rules!.rules().find((r) => r.code === "PH-STAT-IDS")!;
    expect(rule).toBeDefined();
    expect(rule.weight).toBeGreaterThan(0);
    const pass = rule.evaluate(
      { full_name: "A", base_salary: 30_000, country_metadata: GOOD_EMPLOYEE },
      { params: {} },
    );
    expect(pass.passed).toBe(true);
    const fail = rule.evaluate(
      { full_name: "B", base_salary: 30_000, country_metadata: {} },
      { params: {} },
    );
    expect(fail.passed).toBe(false);
  });

  it("audit heuristics report coverage and format separately", () => {
    const heuristics = philippinesPack.providers.audit!.heuristics();
    const coverage = heuristics.find((h) => h.code === "PH-STAT-IDS-COVERAGE")!;
    const format = heuristics.find((h) => h.code === "PH-STAT-IDS-FORMAT")!;
    const ctx = {
      employees: [
        { base_salary: 30_000, country_metadata: GOOD_EMPLOYEE },
        { base_salary: 30_000, country_metadata: { ...GOOD_EMPLOYEE, philhealth: "123" } },
      ],
      params: {},
    };
    expect(coverage.evaluate(ctx).passed).toBe(false);
    expect(coverage.evaluate(ctx).impact).toBe(1);
    expect(format.evaluate(ctx).passed).toBe(false);
  });
});
