// H23-C — Indonesia separation engine tests (PP 35/2021 + UU 6/2023 + MK 168).
import { describe, it, expect } from "bun:test";
import {
  computeIdSeparation,
  monthsOfService,
  type IdSeparationInput,
} from "../engines/separation";

const base: IdSeparationInput = {
  employee: {
    employeeId: "e1",
    fullName: "Budi Santoso",
    joinDate: "2020-01-01",
    separationDate: "2025-06-01",
    contractType: "PKWTT",
  },
  reasonCode: "CLOSURE_NO_LOSSES",
  wageBase: { baseSalary: 5_000_000, fixedAllowances: 500_000, wageFrequency: "monthly" },
  extras: { unusedLeaveDays: 0, thrAlreadyPaid: true },
};

describe("monthsOfService", () => {
  it("floors partial months and never rounds years", () => {
    expect(monthsOfService("2024-06-15", "2025-06-14")).toBe(11);
    expect(monthsOfService("2024-06-15", "2025-06-15")).toBe(12);
    expect(monthsOfService("2023-01-10", "2026-01-09")).toBe(35);
  });
});

describe("floor bands — deliberate fractional cases", () => {
  it("11 months → 1 month pesangon (kurang dari 1 tahun)", () => {
    const r = computeIdSeparation({
      ...base,
      employee: { ...base.employee, joinDate: "2024-07-10", separationDate: "2025-06-05" },
    });
    const p = r.components.find((c) => c.code === "PESANGON");
    expect(p?.amount).toBe(5_500_000); // 1 × (5.000.000 + 500.000)
  });

  it("2 years and 11 months → 3 months pesangon (2–<3 tahun), no UPMK", () => {
    const r = computeIdSeparation({
      ...base,
      employee: { ...base.employee, joinDate: "2022-07-01", separationDate: "2025-06-01" },
    });
    expect(r.components.find((c) => c.code === "PESANGON")?.amount).toBe(16_500_000);
    expect(r.components.find((c) => c.code === "UPMK")).toBeUndefined();
  });

  it("8 years and 3 months → pesangon 9 × UPMK 3", () => {
    const r = computeIdSeparation({
      ...base,
      employee: { ...base.employee, joinDate: "2017-03-01", separationDate: "2025-06-01" },
    });
    expect(r.components.find((c) => c.code === "PESANGON")?.amount).toBe(49_500_000);
    expect(r.components.find((c) => c.code === "UPMK")?.amount).toBe(16_500_000); // 6–<9 tahun → 3
  });
});

describe("entitlement matrix", () => {
  it("resignation → no pesangon, no UPMK; UPH + conditional uang pisah", () => {
    const r = computeIdSeparation({
      ...base,
      reasonCode: "RESIGNATION",
      extras: { unusedLeaveDays: 5, thrAlreadyPaid: true, uangPisahAmount: 2_000_000 },
    });
    expect(r.components.find((c) => c.code === "PESANGON")).toBeUndefined();
    expect(r.components.find((c) => c.code === "UPMK")).toBeUndefined();
    expect(r.components.find((c) => c.code === "UPH_UNUSED_LEAVE")?.amount).toBe(1_100_000);
    expect(r.components.find((c) => c.code === "UANG_PISAH")?.amount).toBe(2_000_000);
  });

  it("resignation without uang pisah amount → warning, not silence", () => {
    const r = computeIdSeparation({ ...base, reasonCode: "RESIGNATION" });
    expect(r.warnings.some((w) => w.includes("uang pisah"))).toBe(true);
  });

  it("efficiency → 0.5× pesangon, 1× UPMK", () => {
    const r = computeIdSeparation({
      ...base,
      reasonCode: "EFFICIENCY",
      employee: { ...base.employee, joinDate: "2017-03-01", separationDate: "2025-06-01" },
    });
    expect(r.components.find((c) => c.code === "PESANGON")?.amount).toBe(24_750_000); // 9 × 0.5 × 5.5jt
    expect(r.components.find((c) => c.code === "UPMK")?.amount).toBe(16_500_000);
  });
});

describe("wage base", () => {
  it("missing fixedAllowances → incomplete, not assumed", () => {
    const r = computeIdSeparation({
      ...base,
      wageBase: { baseSalary: 5_000_000, wageFrequency: "monthly" },
    });
    expect(r.completeness.complete).toBe(false);
    expect(r.completeness.missingInputs.some((m) => m.includes("fixedAllowances"))).toBe(true);
  });

  it("daily-paid worker uses dailyRate × workdays", () => {
    const r = computeIdSeparation({
      ...base,
      wageBase: { baseSalary: 0, fixedAllowances: 0, wageFrequency: "daily", dailyRate: 200_000 },
    });
    expect(r.monthlyWageBase).toBe(5_000_000);
  });

  it("piece-rate worker requires the 12-month average", () => {
    const r = computeIdSeparation({
      ...base,
      wageBase: { baseSalary: 0, wageFrequency: "piece" },
    });
    expect(r.completeness.complete).toBe(false);
    expect(r.completeness.missingInputs.some((m) => m.includes("pieceRate12MonthAverage"))).toBe(true);
  });
});

describe("THR is a sibling component (never inside UPH)", () => {
  it("adds pro-rata THR when unpaid and never double counts", () => {
    const r = computeIdSeparation({
      ...base,
      employee: { ...base.employee, joinDate: "2025-01-01", separationDate: "2025-06-01" },
      extras: { unusedLeaveDays: 0, thrAlreadyPaid: false },
    });
    const thr = r.components.find((c) => c.code === "THR");
    expect(thr?.amount).toBe(2_750_000); // 5/12 × 5.5jt
    expect(r.components.filter((c) => c.code.startsWith("UPH")).some((c) => c.label.includes("THR"))).toBe(false);
  });
});

describe("PKWT regime", () => {
  const pkwtBase: IdSeparationInput = {
    ...base,
    reasonCode: "PKWT_END",
    employee: {
      ...base.employee,
      contractType: "PKWT",
      pkwt: { startDate: "2024-06-01", endDate: "2025-06-01", totalDurationMonths: 12 },
    },
  };

  it("natural expiry → proportional compensation (art. 15(3))", () => {
    const r = computeIdSeparation(pkwtBase);
    expect(r.components.find((c) => c.code === "PKWT_COMPENSATION")?.amount).toBe(5_500_000);
    expect(r.complianceViolations).toHaveLength(0);
  });

  it("early employer termination adds remaining-term wages (art. 17)", () => {
    const r = computeIdSeparation({
      ...pkwtBase,
      reasonCode: "PKWT_EARLY_EMPLOYER",
      employee: {
        ...pkwtBase.employee,
        joinDate: "2024-06-01",
        separationDate: "2024-12-01",
        pkwt: { startDate: "2024-06-01", endDate: "2025-06-01", totalDurationMonths: 12 },
      },
    });
    expect(r.components.find((c) => c.code === "PKWT_COMPENSATION")?.amount).toBe(2_750_000);
    expect(r.components.find((c) => c.code === "PKWT_REMAINING_TERM")?.amount).toBe(33_000_000); // 6 × 5.5jt
  });

  it("duration above 5 years → violation + legal classification + renewal block, NO conversion", () => {
    const r = computeIdSeparation({
      ...pkwtBase,
      employee: {
        ...pkwtBase.employee,
        pkwt: { startDate: "2024-06-01", endDate: "2025-06-01", totalDurationMonths: 66 },
      },
    });
    expect(r.complianceViolations.some((v) => v.code === "ID-PKWT-DURATION")).toBe(true);
    expect(r.requiresLegalClassification).toBe(true);
    expect(r.renewalBlocked).toBe(true);
    // never changes the contract type
    expect(r.inputsSnapshot.employee.contractType).toBe("PKWT");
  });
});

describe("normative gates", () => {
  it("termination on 2026-10-31 is blocked (blockingFrom is inclusive)", () => {
    const r = computeIdSeparation({
      ...base,
      employee: { ...base.employee, separationDate: "2026-10-31" },
    });
    expect(r.status).toBe("blocked");
    expect(r.blockedCode).toBe("BLOCKED_PENDING_REGULATORY_REVALIDATION");
  });

  it("termination before 2024-10-31 requires a certified historical ruleset", () => {
    const r = computeIdSeparation({
      ...base,
      employee: { ...base.employee, joinDate: "2020-01-01", separationDate: "2023-05-10" },
    });
    expect(r.status).toBe("blocked");
    expect(r.blockedCode).toBe("BLOCKED_MISSING_HISTORICAL_RULESET");
  });

  it("unknown reason refuses to compute", () => {
    const r = computeIdSeparation({ ...base, reasonCode: "JUST_BECAUSE" });
    expect(r.status).toBe("blocked");
  });
});

describe("evidence object", () => {
  it("returns statutoryMinimum, trace, snapshot and legal basis", () => {
    const r = computeIdSeparation(base);
    expect(r.status).toBe("computed");
    expect(r.statutoryMinimum).toBeGreaterThan(0);
    expect(r.calculationTrace.length).toBeGreaterThan(3);
    expect(r.inputsSnapshot).toEqual(base);
    expect(r.ruleVersion).toBe("ID-SEPARATION-2026.1");
    expect(r.legalBasis.some((l) => l.instrument === "MK 168/PUU-XXI/2023")).toBe(true);
  });
});
