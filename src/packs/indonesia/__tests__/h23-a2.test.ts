// H23-A (continuation) — TER B/C official tables + annual PPh 21 reconciliation
// with PTKP, biaya jabatan and deductible contributions.
import { describe, it, expect } from "vitest";
import { TER_TABLES } from "@/packs/indonesia/params/ter-tables";
import {
  ptkpForStatus,
  biayaJabatanFor,
  progressiveAnnualTax,
  PTKP_2026,
} from "@/packs/indonesia/params/pph21-annual";
import { terRate, calculateTax, reconcileAnnualPph21 } from "@/lib/engines/indonesia";

describe("TER B/C tables (PP 58/2023 lampiran B & C)", () => {
  it("are marked official and no longer mirror TER A", () => {
    expect(TER_TABLES.B.sourceStatus).toBe("official");
    expect(TER_TABLES.C.sourceStatus).toBe("official");
    expect(TER_TABLES.B.brackets).not.toEqual(TER_TABLES.A.brackets);
    expect(TER_TABLES.C.brackets).not.toEqual(TER_TABLES.A.brackets);
  });

  it("keep monotonic bounds and rates", () => {
    for (const cat of ["A", "B", "C"] as const) {
      const t = TER_TABLES[cat];
      let prevBound = t.zeroThreshold;
      let prevRate = 0;
      for (const [bound, rate] of t.brackets) {
        expect(bound).toBeGreaterThan(prevBound);
        expect(rate).toBeGreaterThan(prevRate);
        prevBound = bound;
        prevRate = rate;
      }
      expect(t.topRate).toBeGreaterThan(prevRate);
    }
  });

  it("applies the category zero thresholds", () => {
    expect(terRate(6_200_000, "B")).toBe(0);
    expect(terRate(6_300_000, "B")).toBe(0.0025);
    expect(terRate(6_600_000, "C")).toBe(0);
    expect(terRate(6_700_000, "C")).toBe(0.0025);
  });

  it("uses the top rate above the last bracket", () => {
    expect(terRate(2_000_000_000, "B")).toBe(0.34);
    expect(terRate(2_000_000_000, "C")).toBe(0.34);
  });

  it("computes tax for a K/1 employee from the B table", () => {
    const r = calculateTax({ monthlyGross: 13_000_000, maritalStatus: "K/1" });
    expect(r.category).toBe("B");
    expect(r.rate).toBe(0.04);
    expect(r.tax).toBe(520_000);
  });
});

describe("PTKP and biaya jabatan", () => {
  it("derives PTKP from the status code", () => {
    expect(ptkpForStatus("TK/0")).toBe(54_000_000);
    expect(ptkpForStatus("K/0")).toBe(58_500_000);
    expect(ptkpForStatus("K/3")).toBe(72_000_000);
    expect(ptkpForStatus("bogus")).toBe(PTKP_2026.base);
  });

  it("caps biaya jabatan at Rp 6.000.000/year", () => {
    expect(biayaJabatanFor(60_000_000)).toBe(3_000_000);
    expect(biayaJabatanFor(500_000_000)).toBe(6_000_000);
  });

  it("applies the HPP progressive brackets", () => {
    expect(progressiveAnnualTax(60_000_000)).toBe(3_000_000);
    expect(progressiveAnnualTax(100_000_000)).toBe(3_000_000 + Math.round(40_000_000 * 0.15));
  });
});

describe("Annual reconciliation with statutory deductions", () => {
  it("stays backwards compatible when only gross is supplied", () => {
    const r = reconcileAnnualPph21({ year: 2026, annualGross: 200_000_000, withheldTerTotal: 10_000_000 });
    expect(r.annualTaxableIncome).toBe(146_000_000);
    expect(r.deductions.occupationalAllowance).toBe(0);
  });

  it("subtracts PTKP, biaya jabatan and contributions", () => {
    const r = reconcileAnnualPph21({
      year: 2026,
      annualGross: 200_000_000,
      withheldTerTotal: 0,
      maritalStatus: "K/2",
      applyOccupationalAllowance: true,
      deductibleContributions: 6_000_000,
    });
    expect(r.deductions.ptkp).toBe(67_500_000);
    expect(r.deductions.occupationalAllowance).toBe(6_000_000);
    expect(r.annualTaxableIncome).toBe(200_000_000 - 6_000_000 - 6_000_000 - 67_500_000);
    expect(r.annualTaxLiability).toBe(progressiveAnnualTax(r.annualTaxableIncome));
    expect(r.legalBasis).toContain("UU 7/2021");
  });
});
