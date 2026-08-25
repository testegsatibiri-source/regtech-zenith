// PH statutory leave engine — Fase B of H22.
// Sources: Labor Code Art. 95 (SIL), RA 11210 (105-day Expanded Maternity
// Leave), RA 8187 (Paternity Leave), RA 8972 (Solo Parent Leave, as amended by
// RA 11861 — 7 days), RA 9262 (VAWC Leave), RA 9710 (Magna Carta of Women —
// Special Leave for gynecological disorders).
//
// Only SIL converts to cash (Art. 95). Parental and special leaves are use-or-
// lose and never enter the final pay conversion.

import { PH_PARAMS } from "../params";
import type {
  LeaveConversionInput,
  LeaveConversionOutput,
  LeaveEntitlement,
  LeaveEntitlementInput,
  LeaveType,
  SalaryDifferentialInput,
  SalaryDifferentialOutput,
} from "@/sdk/providers/LeaveProvider";
import type { LeaveAccrualSnapshot } from "@/sdk/providers/SeparationProvider";

export const PH_LEAVE_TYPES: LeaveType[] = [
  {
    code: "PH-SIL",
    title: "Service Incentive Leave",
    legalBasis: "Labor Code Art. 95",
    category: "service",
    days: PH_PARAMS.leave.silDays,
    cycle: "annual",
    paid: true,
    convertibleToCash: true,
    minTenureMonths: 12,
    notes: "5 days per year after 1 year of service; unused days convert to cash.",
  },
  {
    code: "PH-MATERNITY",
    title: "Expanded Maternity Leave",
    legalBasis: "RA 11210",
    category: "parental",
    days: PH_PARAMS.leave.maternityDays,
    cycle: "per_event",
    paid: true,
    convertibleToCash: false,
    minTenureMonths: 0,
    requiresProof: "Medical certificate / proof of pregnancy; SSS MAT-1 notification",
    notes:
      "105 days (120 for solo parents), 60 days for miscarriage. Up to 7 days transferable to the father. Employer pays the salary differential.",
  },
  {
    code: "PH-PATERNITY",
    title: "Paternity Leave",
    legalBasis: "RA 8187",
    category: "parental",
    days: PH_PARAMS.leave.paternityDays,
    cycle: "per_event",
    paid: true,
    convertibleToCash: false,
    minTenureMonths: 0,
    requiresProof: "Marriage certificate and birth certificate of the child",
    notes: "7 days, married male employee, first four deliveries of the legitimate spouse.",
  },
  {
    code: "PH-SOLO-PARENT",
    title: "Parental Leave for Solo Parents",
    legalBasis: "RA 8972 as amended by RA 11861",
    category: "special",
    days: PH_PARAMS.leave.soloParentDays,
    cycle: "annual",
    paid: true,
    convertibleToCash: false,
    minTenureMonths: 6,
    requiresProof: "Solo Parent ID issued by the DSWD / LGU (valid)",
  },
  {
    code: "PH-VAWC",
    title: "Leave for Victims of Violence Against Women and their Children",
    legalBasis: "RA 9262",
    category: "special",
    days: PH_PARAMS.leave.vawcDays,
    cycle: "annual",
    paid: true,
    convertibleToCash: false,
    minTenureMonths: 0,
    requiresProof: "Barangay Protection Order, police report or certification",
  },
  {
    code: "PH-GYNE",
    title: "Special Leave for Gynecological Disorders",
    legalBasis: "RA 9710 (Magna Carta of Women)",
    category: "medical",
    days: PH_PARAMS.leave.gynecologicalDays,
    cycle: "annual",
    paid: true,
    convertibleToCash: false,
    minTenureMonths: 6,
    requiresProof: "Medical certificate and proof of gynecological surgery",
    notes: "Up to 2 months with full pay, following surgery, per 12-month period.",
  },
];

export function phLeaveTypes(): LeaveType[] {
  return PH_LEAVE_TYPES;
}

function tenureMonths(joinDate: string, asOf: string): number {
  const a = new Date(joinDate);
  const b = new Date(asOf);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(0, months);
}

export function phLeaveEntitlement(input: LeaveEntitlementInput): LeaveEntitlement[] {
  const { employee } = input;
  const asOf = input.asOf || new Date().toISOString().slice(0, 10);
  const used = input.usedDays ?? {};
  const months = tenureMonths(employee.joinDate, asOf);
  const isFemale = employee.sex === "female";
  const isMale = employee.sex === "male";
  const married = (employee.maritalStatus ?? "").toLowerCase() === "married";

  return PH_LEAVE_TYPES.map((t) => {
    let eligible = months >= t.minTenureMonths;
    let reason = eligible
      ? `${t.days} day(s) under ${t.legalBasis}`
      : `Requires ${t.minTenureMonths} month(s) of service (currently ${months})`;
    let days = eligible ? t.days : 0;

    if (t.code === "PH-MATERNITY") {
      if (employee.sex == null) {
        eligible = false;
        days = 0;
        reason = "Sex not recorded — maternity eligibility cannot be determined (RA 11210)";
      } else if (!isFemale) {
        eligible = false;
        days = 0;
        reason = "Maternity leave applies to female employees (RA 11210)";
      } else if (employee.soloParent) {
        days = PH_PARAMS.leave.maternitySoloParentDays;
        reason = `Solo parent: ${days} days under RA 11210 §3`;
      }
    }

    if (t.code === "PH-PATERNITY") {
      if (employee.sex == null) {
        eligible = false;
        days = 0;
        reason = "Sex not recorded — paternity eligibility cannot be determined (RA 8187)";
      } else if (!isMale || !married) {
        eligible = false;
        days = 0;
        reason = "Paternity leave requires a married male employee (RA 8187)";
      } else if ((employee.childrenCount ?? 0) >= PH_PARAMS.leave.paternityMaxChildren) {
        eligible = false;
        days = 0;
        reason = `Exhausted: paternity leave covers only the first ${PH_PARAMS.leave.paternityMaxChildren} deliveries (RA 8187)`;
      }
    }

    if (t.code === "PH-SOLO-PARENT" && eligible && !employee.soloParent) {
      eligible = false;
      days = 0;
      reason = "Requires a valid Solo Parent ID on file (RA 8972 / RA 11861)";
    }

    if (t.code === "PH-GYNE" && eligible && !isFemale) {
      eligible = false;
      days = 0;
      reason = "Special leave under RA 9710 applies to female employees";
    }

    const usedDays = Math.max(0, used[t.code] ?? 0);
    return {
      code: t.code,
      title: t.title,
      legalBasis: t.legalBasis,
      eligible,
      entitledDays: days,
      usedDays,
      remainingDays: Math.max(0, Math.round((days - usedDays) * 100) / 100),
      paid: t.paid,
      convertibleToCash: t.convertibleToCash,
      reason,
    };
  });
}

/** SIL snapshot consumed by the final pay engine (Fase A boundary contract). */
export function phLeaveAccrual(input: LeaveEntitlementInput): LeaveAccrualSnapshot {
  const asOf = input.asOf || new Date().toISOString().slice(0, 10);
  const months = tenureMonths(input.employee.joinDate, asOf);
  const dailyRate =
    Math.round((input.employee.baseSalary / PH_PARAMS.workingDaysPerMonth) * 100) / 100;

  if (months < 12) {
    return {
      silUnusedDays: 0,
      silDailyRate: dailyRate,
      complete: true,
      missing: undefined,
    };
  }

  const used = Math.max(0, input.usedDays?.["PH-SIL"] ?? 0);
  const unused = Math.max(0, PH_PARAMS.leave.silDays - used);
  return { silUnusedDays: unused, silDailyRate: dailyRate, complete: true };
}

export function phLeaveConvert(input: LeaveConversionInput): LeaveConversionOutput {
  const type = PH_LEAVE_TYPES.find((t) => t.code === input.code);
  const dailyRate =
    Math.round((input.monthlySalary / PH_PARAMS.workingDaysPerMonth) * 100) / 100;

  if (!type) {
    return { convertible: false, days: 0, dailyRate, amount: 0, reason: `Unknown leave type ${input.code}` };
  }
  if (!type.convertibleToCash) {
    return {
      convertible: false,
      days: 0,
      dailyRate,
      amount: 0,
      reason: `${type.title} is use-or-lose and does not convert to cash (${type.legalBasis})`,
    };
  }
  const days = Math.max(0, input.unusedDays);
  return {
    convertible: true,
    days,
    dailyRate,
    amount: Math.round(days * dailyRate * 100) / 100,
    reason: `${days} unused day(s) × ₱${dailyRate.toLocaleString("en-US")} (${type.legalBasis})`,
  };
}

/** RA 11210 §5 — employer pays the difference between full pay and the SSS benefit. */
export function phSalaryDifferential(input: SalaryDifferentialInput): SalaryDifferentialOutput {
  const dailyRate = input.monthlySalary / PH_PARAMS.leave.maternityDailyDivisor;
  const fullSalaryForLeave = Math.round(dailyRate * input.leaveDays * 100) / 100;
  const employerCost = Math.max(0, Math.round((fullSalaryForLeave - input.agencyBenefit) * 100) / 100);
  return {
    fullSalaryForLeave,
    agencyBenefit: input.agencyBenefit,
    employerCost,
    legalBasis: "RA 11210 §5 — maternity salary differential (employer-funded)",
  };
}
