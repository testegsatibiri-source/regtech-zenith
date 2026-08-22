import { describe, it, expect } from "bun:test";
import {
  phGrounds,
  phComputeSeparationPay,
  phComputeFinalPay,
  phProcessRequirements,
} from "../engines/separation";
import { PH_PARAMS } from "../params";

const rulesetVersion = `PH-${PH_PARAMS.version}`;

describe("PH separation engine (H22 Phase A)", () => {
  it("exposes all Labor Code grounds for offboarding", () => {
    const grounds = phGrounds();
    expect(grounds.length).toBe(4);
    const codes = grounds.map((g) => g.code);
    expect(codes).toContain("PH-LC-297-JUST-CAUSE");
    expect(codes).toContain("PH-LC-298-AUTHORIZED");
    expect(codes).toContain("PH-LC-299-DISEASE");
    expect(codes).toContain("PH-LC-285-CONSTRUCTIVE");
  });

  it("denies separation pay for just cause and resignation", () => {
    const grounds = phGrounds();
    for (const code of ["PH-LC-297-JUST-CAUSE", "PH-LC-285-CONSTRUCTIVE"]) {
      const out = phComputeSeparationPay({
        monthlySalary: 30_000,
        monthsOfService: 60,
        ground: grounds.find((g) => g.code === code)!,
      });
      expect(out.eligible).toBe(false);
      expect(out.amount).toBe(0);
    }
  });

  it("awards 1 month per year for authorized causes (Art. 298)", () => {
    const ground = phGrounds().find((g) => g.code === "PH-LC-298-AUTHORIZED")!;
    const out = phComputeSeparationPay({
      monthlySalary: 30_000,
      monthsOfService: 24,
      ground,
    });
    expect(out.eligible).toBe(true);
    expect(out.monthsDue).toBe(2);
    expect(out.amount).toBe(60_000);
  });

  it("awards 1/2 month per year for disease (Art. 299)", () => {
    const ground = phGrounds().find((g) => g.code === "PH-LC-299-DISEASE")!;
    const out = phComputeSeparationPay({
      monthlySalary: 40_000,
      monthsOfService: 36,
      ground,
    });
    expect(out.eligible).toBe(true);
    expect(out.monthsDue).toBe(1.5);
    expect(out.amount).toBe(60_000);
  });

  it("produces Twin Notice for just-cause cases", () => {
    const ground = phGrounds().find((g) => g.code === "PH-LC-297-JUST-CAUSE")!;
    const notices = phProcessRequirements({
      ground,
      processStartDate: "2026-05-01",
      separationDate: "2026-05-15",
    });
    const nte = notices.find((n) => n.type === "nte");
    const decision = notices.find((n) => n.type === "decision");
    const coe = notices.find((n) => n.type === "coe");
    expect(nte).toBeDefined();
    expect(decision).toBeDefined();
    expect(coe).toBeDefined();
    expect(nte!.mandatory).toBe(true);
    expect(decision!.mandatory).toBe(true);
    expect(nte!.dueDate).toBe("2026-05-06"); // 5 calendar days
    expect(decision!.dueDate).toBe("2026-05-08"); // 7 calendar days
  });

  it("requires 30-day advance notice to DOLE for authorized causes", () => {
    const ground = phGrounds().find((g) => g.code === "PH-LC-298-AUTHORIZED")!;
    const notices = phProcessRequirements({
      ground,
      separationDate: "2026-06-15",
    });
    const dole = notices.find((n) => n.type === "dole_advance");
    expect(dole).toBeDefined();
    expect(dole!.mandatory).toBe(true);
    expect(dole!.dueDate).toBe("2026-05-16"); // 30 days before separation
  });

  it("computes final pay with prorata, 13th and separation pay", () => {
    const ground = phGrounds().find((g) => g.code === "PH-LC-298-AUTHORIZED")!;
    const out = phComputeFinalPay(
      {
        employee: {
          employeeId: "emp-001",
          fullName: "Juan Cruz",
          baseSalary: 30_000,
          joinDate: "2023-01-15",
          separationDate: "2026-05-15",
        },
        separation: {
          ground,
          monthlySalaryForStatutory: 30_000,
          ytdAnnualGrossEarned: 150_000,
          finalPeriodDaysWorked: 11,
          finalPeriodDays: 22,
          leaveAccrual: null,
        },
        thirteenthAmount: 12_500,
      },
      rulesetVersion,
    );

    // Prorata salary: 30,000 / 22 * 11 = 15,000
    expect(out.components.find((c) => c.code === "PRORATA_SALARY")!.amount).toBe(15_000);
    // 13th month: 12,500 (given)
    expect(out.components.find((c) => c.code === "THIRTEENTH_PRORATA")!.amount).toBe(12_500);
    // Separation pay: 3 years * 1 month = 90,000
    expect(out.components.find((c) => c.code === "SEPARATION_PAY")!.amount).toBe(90_000);
    // SIL is missing so the result is incomplete, not a final settlement
    expect(out.complete).toBe(false);
    expect(out.missing).toContain("LeaveProvider not available — SIL unused balance cannot be converted yet (Fase A)");
    expect(out.total).toBe(117_500); // gross - deductions
    expect(out.dueDate).toBe("2026-06-14"); // 30 calendar days after 2026-05-15
    expect(out.rulesetVersion).toBe(rulesetVersion);
  });

  it("computes final pay as complete when leave accrual is supplied", () => {
    const ground = phGrounds().find((g) => g.code === "PH-LC-285-CONSTRUCTIVE")!;
    const out = phComputeFinalPay(
      {
        employee: {
          employeeId: "emp-002",
          fullName: "Maria Santos",
          baseSalary: 30_000,
          joinDate: "2025-01-15",
          separationDate: "2026-05-15",
        },
        separation: {
          ground,
          monthlySalaryForStatutory: 30_000,
          ytdAnnualGrossEarned: 150_000,
          finalPeriodDaysWorked: 11,
          finalPeriodDays: 22,
          leaveAccrual: {
            silUnusedDays: 5,
            silDailyRate: 1_363.64,
            complete: true,
          },
        },
        thirteenthAmount: 12_500,
      },
      rulesetVersion,
    );
    expect(out.complete).toBe(true);
    expect(out.missing).toEqual([]);
    const sil = out.components.find((c) => c.code === "SIL_UNUSED")!;
    expect(sil.amount).toBeCloseTo(6_818.18, 2);
    expect(out.total).toBeCloseTo(34_318.18, 2);
  });

  it("returns 30-day final pay deadline for all cases (DOLE LA 06-20)", () => {
    const ground = phGrounds().find((g) => g.code === "PH-LC-285-CONSTRUCTIVE")!;
    const out = phComputeFinalPay(
      {
        employee: {
          employeeId: "emp-003",
          fullName: "Pedro Reyes",
          baseSalary: 30_000,
          joinDate: "2025-06-01",
          separationDate: "2026-01-31",
        },
        separation: {
          ground,
          monthlySalaryForStatutory: 30_000,
          ytdAnnualGrossEarned: 210_000,
          finalPeriodDaysWorked: 22,
          finalPeriodDays: 22,
          leaveAccrual: { silUnusedDays: 0, silDailyRate: 0, complete: true },
        },
      },
      rulesetVersion,
    );
    expect(out.dueDate).toBe("2026-03-02"); // 30 days after 2026-01-31
  });
});
