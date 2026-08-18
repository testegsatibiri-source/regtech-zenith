import { describe, it, expect } from "vitest";
import { philippinesPack } from "../index";
import { PH_FILING_FORMS, generatePhFiling } from "../engines/filings";
import type { FilingRequest } from "@/sdk";

const employer = {
  legalName: "Acme Manila Inc.",
  statutoryMetadata: {
    tin: "123456789000",
    rdo: "049",
    sss: "0312345673",
    philhealth: "010123456789",
    pagibig: "121234567890",
  },
};

const employees = [
  {
    fullName: "Juan Dela Cruz",
    identifiers: {
      tin: "111222333000",
      sss: "3412345678",
      philhealth: "020123456789",
      pagibig: "131234567890",
    },
    gross: 30_000,
    taxWithheld: 1_350,
    employeeContributions: { sss: 1_350, philhealth: 750, pagibig: 200 },
    employerContributions: { sss: 2_850, ec: 30, philhealth: 750, pagibig: 200 },
    net: 26_350,
    thirteenthMonth: 30_000,
  },
];

const req = (formCode: string, month?: number): FilingRequest => ({
  formCode,
  year: 2026,
  month,
  employer,
  employees,
});

describe("PH filing provider (H21 Phase 4)", () => {
  it("is registered on the pack and declares five forms", () => {
    expect(philippinesPack.supports("filings")).toBe(true);
    expect(philippinesPack.providers.filings?.forms()).toHaveLength(5);
    expect(PH_FILING_FORMS.map((f) => f.code)).toEqual([
      "BIR-1601C", "BIR-1604C-ALPHALIST", "SSS-R3", "PHIC-RF1", "HDMF-MCRF",
    ]);
  });

  it("rejects an unknown form and a monthly form without a period", () => {
    expect(() => generatePhFiling(req("NOPE", 1))).toThrow(/Unknown PH filing form/);
    expect(() => generatePhFiling(req("BIR-1601C"))).toThrow(/monthly form/);
  });

  it("1601-C nets statutory contributions out of taxable compensation", () => {
    const a = generatePhFiling(req("BIR-1601C", 3));
    expect(a.filename).toBe("BIR-1601C_123456789000_202603.csv");
    expect(a.totals.gross).toBe(30_000);
    expect(a.totals.statutoryDeductions).toBe(2_300);
    expect(a.totals.taxable).toBe(27_700);
    expect(a.content).toContain("Total taxes withheld,1350.00");
  });

  it("alphalist DAT carries header, one detail row per employee and a control total", () => {
    const a = generatePhFiling(req("BIR-1604C-ALPHALIST"));
    const lines = a.content.trim().split("\n");
    expect(lines[0]!.startsWith("HDR,1604C,S7.1,123456789,000")).toBe(true);
    expect(lines[1]!.startsWith("D7.1,111222333,000,DELA CRUZ,JUAN")).toBe(true);
    expect(lines[2]).toBe("CTR,1,30000.00,1350.00");
    expect(a.rowCount).toBe(1);
  });

  it("SSS R-3 is fixed width and totals EE + ER + EC", () => {
    const a = generatePhFiling(req("SSS-R3", 3));
    const [header, detail, trailer] = a.content.trim().split("\n");
    expect(header!.startsWith("H")).toBe(true);
    expect(detail!.startsWith("D3412345678")).toBe(true);
    expect(trailer!.startsWith("T000001")).toBe(true);
    expect(a.totals.total).toBe(4_230);
  });

  it("RF-1 and MCRF report the employee and employer shares per scheme", () => {
    const rf1 = generatePhFiling(req("PHIC-RF1", 3));
    expect(rf1.totals).toMatchObject({ employee: 750, employer: 750, total: 1_500 });
    const mcrf = generatePhFiling(req("HDMF-MCRF", 3));
    expect(mcrf.totals).toMatchObject({ employee: 200, employer: 200, total: 400 });
    expect(mcrf.content).toContain("EMPLOYER_ID,121234567890");
  });

  it("warns when identifiers are missing and when the period has no payroll", () => {
    const a = generatePhFiling({
      formCode: "PHIC-RF1",
      year: 2026,
      month: 3,
      employer: { legalName: "No Registry Inc.", statutoryMetadata: {} },
      employees: [],
    });
    expect(a.warnings.some((w) => w.startsWith("Employer:"))).toBe(true);
    expect(a.warnings).toContain("No payroll records found for the selected period");
    expect(a.rowCount).toBe(0);
  });

  it("stamps the ruleset version that produced the numbers (DEBT-023)", () => {
    expect(generatePhFiling(req("SSS-R3", 3)).rulesetVersion)
      .toBe(philippinesPack.manifest.rulesetVersion);
  });

  it("is deterministic — identical input yields byte-identical output", () => {
    expect(generatePhFiling(req("SSS-R3", 3)).content)
      .toBe(generatePhFiling(req("SSS-R3", 3)).content);
  });
});
