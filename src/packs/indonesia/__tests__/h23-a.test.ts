// H23-A — Indonesia fiscal parity tests (BPJS 2026, overtime, annual PPh 21 reconciliation).
import { describe, expect, it } from "vitest";
import { calculateBpjs, calculateOvertime, reconcileAnnualPph21 } from "@/lib/engines/indonesia";
import { BPJS_2026, bpjsConclusive } from "@/packs/indonesia/params/bpjs-2026";

describe("BPJS 2026 parameters", () => {
  it("uses official Ketenagakerjaan rates for JHT/JP/JKK/JKM/JKP", () => {
    expect(BPJS_2026.jht.sourceStatus).toBe("official");
    expect(BPJS_2026.jp.sourceStatus).toBe("official");
    expect(BPJS_2026.jkk.sourceStatus).toBe("official");
    expect(BPJS_2026.jkm.sourceStatus).toBe("official");
    expect(BPJS_2026.jkp.sourceStatus).toBe("official");
  });

  it("marks health ceiling as media-report pending primary BPJS Kesehatan decree", () => {
    expect(BPJS_2026.health.sourceStatus).toBe("media-report");
  });

  it("is not fully conclusive because health parameters are not yet official", () => {
    expect(bpjsConclusive(BPJS_2026)).toBe(false);
  });

  it("calculates JKK by risk level", () => {
    const veryLow = calculateBpjs({ salary: 10_000_000, jkkRiskLevel: "very-low" });
    const veryHigh = calculateBpjs({ salary: 10_000_000, jkkRiskLevel: "very-high" });
    expect(veryLow.employer.jkk).toBe(Math.round(10_000_000 * 0.0024));
    expect(veryHigh.employer.jkk).toBe(Math.round(10_000_000 * 0.0174));
    expect(veryHigh.employer.jkk).toBeGreaterThan(veryLow.employer.jkk);
  });

  it("caps health and JP contributions", () => {
    const result = calculateBpjs({ salary: 50_000_000 });
    expect(result.employee.health).toBe(
      Math.round(BPJS_2026.health.cap * BPJS_2026.health.employeeRate),
    );
    expect(result.employee.jp).toBe(Math.round(BPJS_2026.jp.cap * BPJS_2026.jp.employeeRate));
  });

  it("optionally includes JKP financed by government + recomposition", () => {
    const result = calculateBpjs({ salary: 10_000_000, includeJkp: true });
    expect(result.jkp).toBeDefined();
    expect(result.jkp!.total).toBe(
      result.jkp!.government + result.jkp!.jkkRecomposition + result.jkp!.jkmRecomposition,
    );
    expect(result.employer.jkp).toBe(result.jkp!.jkkRecomposition + result.jkp!.jkmRecomposition);
  });
});

describe("Overtime (Lembur)", () => {
  it("uses 1/173 of monthly salary as the hourly base", () => {
    const result = calculateOvertime({ monthlySalary: 5_200_000, hours: 1, dayType: "weekday" });
    expect(result.hourlyRate).toBe(Math.round(5_200_000 / 173));
  });

  it("applies 1.5x for the first 4 weekday hours and 2x afterwards", () => {
    const result = calculateOvertime({ monthlySalary: 5_200_000, hours: 5, dayType: "weekday" });
    const base = 5_200_000 / 173;
    const expected = Math.round(4 * base * 1.5) + Math.round(1 * base * 2);
    expect(result.totalPay).toBe(expected);
    expect(result.breakdown).toHaveLength(2);
  });

  it("applies 2x then 3x on public holidays", () => {
    const result = calculateOvertime({
      monthlySalary: 5_200_000,
      hours: 10,
      dayType: "public-holiday",
      pattern: "5x8",
    });
    const base = 5_200_000 / 173;
    const expected = Math.round(8 * base * 2) + Math.round(2 * base * 3);
    expect(result.totalPay).toBe(expected);
  });

  it("uses 7 regular hours for 6x7 pattern on rest days", () => {
    const result = calculateOvertime({
      monthlySalary: 5_200_000,
      hours: 8,
      dayType: "rest-day",
      pattern: "6x7",
    });
    const base = 5_200_000 / 173;
    const expected = Math.round(7 * base * 2) + Math.round(1 * base * 3);
    expect(result.totalPay).toBe(expected);
  });
});

describe("Annual PPh 21 reconciliation", () => {
  it("reports underpaid when annual liability exceeds withheld TER", () => {
    const result = reconcileAnnualPph21({
      year: 2026,
      annualGross: 200_000_000,
      withheldTerTotal: 10_000_000,
    });
    expect(result.annualTaxableIncome).toBe(146_000_000); // 200M - PTKP 54M
    expect(result.underpaid).toBe(result.annualTaxLiability - 10_000_000);
    expect(result.underpaid).toBeGreaterThan(0);
  });

  it("reports over-withheld when TER exceeds annual liability", () => {
    const result = reconcileAnnualPph21({
      year: 2026,
      annualGross: 80_000_000,
      withheldTerTotal: 5_000_000,
    });
    expect(result.underpaid).toBeLessThan(0);
  });
});
