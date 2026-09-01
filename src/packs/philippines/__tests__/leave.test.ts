// H22 Fase B — statutory leave conformance (PH).
import { describe, it, expect } from "vitest";
import {
  PH_LEAVE_TYPES,
  phLeaveEntitlement,
  phLeaveAccrual,
  phLeaveConvert,
  phSalaryDifferential,
} from "../engines/leave";
import { philippinesPack } from "../index";
import { phComputeFinalPay } from "../engines/separation";
import { PH_SEPARATION_GROUNDS } from "../engines/separation";

const base = {
  employeeId: "e1",
  fullName: "Maria Santos",
  baseSalary: 26_400,
  joinDate: "2023-01-01",
};

describe("PH leave catalogue", () => {
  it("ships the statutory types with legal basis", () => {
    const codes = PH_LEAVE_TYPES.map((t) => t.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "PH-SIL",
        "PH-MATERNITY",
        "PH-PATERNITY",
        "PH-SOLO-PARENT",
        "PH-VAWC",
        "PH-GYNE",
      ]),
    );
    for (const t of PH_LEAVE_TYPES) expect(t.legalBasis).toBeTruthy();
  });

  it("marks only SIL as convertible to cash", () => {
    const convertible = PH_LEAVE_TYPES.filter((t) => t.convertibleToCash).map((t) => t.code);
    expect(convertible).toEqual(["PH-SIL"]);
  });
});

describe("PH entitlement rules", () => {
  it("grants 5 SIL days only after one year of service (Art. 95)", () => {
    const early = phLeaveEntitlement({
      employee: { ...base, joinDate: "2026-01-01", sex: "female" },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-SIL")!;
    expect(early.eligible).toBe(false);
    expect(early.entitledDays).toBe(0);

    const later = phLeaveEntitlement({
      employee: { ...base, sex: "female" },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-SIL")!;
    expect(later.eligible).toBe(true);
    expect(later.entitledDays).toBe(5);
  });

  it("gives 105 days maternity and 120 to a solo parent (RA 11210)", () => {
    const normal = phLeaveEntitlement({
      employee: { ...base, sex: "female" },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-MATERNITY")!;
    expect(normal.entitledDays).toBe(105);

    const solo = phLeaveEntitlement({
      employee: {
        ...base,
        sex: "female",
        soloParent: true,
        countryMetadata: {
          solo_parent: true,
          solo_parent_id: "SP-2026-0001",
          solo_parent_id_expiry: "2027-01-01",
        },
      },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-MATERNITY")!;
    expect(solo.entitledDays).toBe(120);
  });

  it("withholds solo-parent benefits without a valid Solo Parent ID (RA 11861)", () => {
    // Flag only, no ID on file.
    const flagOnly = phLeaveEntitlement({
      employee: {
        ...base,
        sex: "female",
        soloParent: true,
        countryMetadata: { solo_parent: true },
      },
      asOf: "2026-06-01",
    });
    expect(flagOnly.find((e) => e.code === "PH-MATERNITY")!.entitledDays).toBe(105);
    expect(flagOnly.find((e) => e.code === "PH-SOLO-PARENT")!.eligible).toBe(false);

    // Expired ID.
    const expired = phLeaveEntitlement({
      employee: {
        ...base,
        sex: "female",
        soloParent: true,
        countryMetadata: {
          solo_parent: true,
          solo_parent_id: "SP-2024-0009",
          solo_parent_id_expiry: "2025-12-31",
        },
      },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-SOLO-PARENT")!;
    expect(expired.eligible).toBe(false);
    expect(expired.reason).toMatch(/expired/i);

    // Valid ID unlocks the 7-day parental leave.
    const valid = phLeaveEntitlement({
      employee: {
        ...base,
        sex: "female",
        soloParent: true,
        countryMetadata: {
          solo_parent: true,
          solo_parent_id: "SP-2026-0001",
          solo_parent_id_expiry: "2027-01-01",
        },
      },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-SOLO-PARENT")!;
    expect(valid.eligible).toBe(true);
    expect(valid.entitledDays).toBe(7);
  });

  it("limits paternity leave to married male employees, first 4 deliveries (RA 8187)", () => {
    const ok = phLeaveEntitlement({
      employee: { ...base, sex: "male", maritalStatus: "married", childrenCount: 2 },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-PATERNITY")!;
    expect(ok.eligible).toBe(true);
    expect(ok.entitledDays).toBe(7);

    const exhausted = phLeaveEntitlement({
      employee: { ...base, sex: "male", maritalStatus: "married", childrenCount: 4 },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-PATERNITY")!;
    expect(exhausted.eligible).toBe(false);

    const single = phLeaveEntitlement({
      employee: { ...base, sex: "male", maritalStatus: "single" },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-PATERNITY")!;
    expect(single.eligible).toBe(false);
  });

  it("requires a Solo Parent ID for RA 8972 leave", () => {
    const without = phLeaveEntitlement({
      employee: { ...base, sex: "female" },
      asOf: "2026-06-01",
    }).find((e) => e.code === "PH-SOLO-PARENT")!;
    expect(without.eligible).toBe(false);
    expect(without.reason).toMatch(/Solo Parent ID/i);
  });

  it("nets used days out of the remaining balance", () => {
    const sil = phLeaveEntitlement({
      employee: { ...base, sex: "female" },
      asOf: "2026-06-01",
      usedDays: { "PH-SIL": 2 },
    }).find((e) => e.code === "PH-SIL")!;
    expect(sil.remainingDays).toBe(3);
  });
});

describe("PH conversion and salary differential", () => {
  it("converts unused SIL at the daily rate", () => {
    const out = phLeaveConvert({ code: "PH-SIL", unusedDays: 3, monthlySalary: 26_400 });
    expect(out.convertible).toBe(true);
    expect(out.dailyRate).toBe(1200);
    expect(out.amount).toBe(3600);
  });

  it("never converts parental leave to cash", () => {
    const out = phLeaveConvert({ code: "PH-PATERNITY", unusedDays: 7, monthlySalary: 26_400 });
    expect(out.convertible).toBe(false);
    expect(out.amount).toBe(0);
  });

  it("charges the employer only the difference over the SSS benefit (RA 11210 §5)", () => {
    const out = phSalaryDifferential({
      monthlySalary: 30_000,
      agencyBenefit: 70_000,
      leaveDays: 105,
    });
    expect(out.fullSalaryForLeave).toBe(105_000);
    expect(out.employerCost).toBe(35_000);

    const covered = phSalaryDifferential({
      monthlySalary: 10_000,
      agencyBenefit: 50_000,
      leaveDays: 105,
    });
    expect(covered.employerCost).toBe(0);
  });
});

describe("Fase A ↔ Fase B boundary", () => {
  const ground = PH_SEPARATION_GROUNDS.find((g) => g.code === "PH-LC-285-CONSTRUCTIVE")!;

  it("still reports incompleteness when no accrual snapshot is supplied", () => {
    const out = phComputeFinalPay(
      {
        employee: {
          employeeId: "e1",
          fullName: "X",
          baseSalary: 26_400,
          joinDate: "2023-01-01",
          separationDate: "2026-06-30",
        },
        separation: {
          ground,
          monthlySalaryForStatutory: 26_400,
          ytdAnnualGrossEarned: 158_400,
          finalPeriodDaysWorked: 22,
          finalPeriodDays: 22,
          leaveAccrual: null,
        },
      },
      "PH-2024.6",
    );
    expect(out.complete).toBe(false);
    expect(out.missing.join(" ")).toMatch(/LeaveProvider/);
  });

  it("includes unused SIL once the leave provider supplies the accrual", () => {
    const accrual = phLeaveAccrual({
      employee: { ...base, sex: "female" },
      asOf: "2026-06-30",
      usedDays: { "PH-SIL": 2 },
    });
    expect(accrual.complete).toBe(true);
    expect(accrual.silUnusedDays).toBe(3);

    const out = phComputeFinalPay(
      {
        employee: {
          employeeId: "e1",
          fullName: "X",
          baseSalary: 26_400,
          joinDate: "2023-01-01",
          separationDate: "2026-06-30",
        },
        separation: {
          ground,
          monthlySalaryForStatutory: 26_400,
          ytdAnnualGrossEarned: 158_400,
          finalPeriodDaysWorked: 22,
          finalPeriodDays: 22,
          leaveAccrual: accrual,
        },
      },
      "PH-2024.6",
    );
    expect(out.complete).toBe(true);
    expect(out.components.find((c) => c.code === "SIL_UNUSED")?.amount).toBe(3600);
  });
});

describe("pack registration", () => {
  it("advertises the leave capability and wires the provider", () => {
    expect(philippinesPack.supports("leave")).toBe(true);
    expect(philippinesPack.providers.leave).toBeDefined();
    expect(philippinesPack.manifest.rulesetVersion).toBe("PH-2024.6");
  });
});
