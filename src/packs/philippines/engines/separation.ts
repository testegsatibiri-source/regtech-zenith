// PH offboarding engine — Fase A of H22.
// Implements Labor Code Arts. 297–299, DOLE LA 06-20 final pay deadline, and
// the Twin Notice rule for just-cause termination. The engine is usable
// standalone (for tests / outside the Runtime) or via the SeparationProvider.
//
// Boundary design (Fase A): leave accrual is accepted as null and explicitly
// marked as incomplete. A final pay returned with `complete: false` must NOT be
// presented as a final settlement — the system should warn that the calculation
// lacks SIL data.

import { PH_PARAMS } from "../params";
import type {
  FinalPayComponent,
  FinalPayInput,
  FinalPayOutput,
  SeparationGround,
  SeparationNotice,
  SeparationPayInput,
  SeparationPayOutput,
  SeparationRequirementsInput,
} from "@/sdk/providers/SeparationProvider";

export const PH_SEPARATION_GROUNDS: SeparationGround[] = [
  {
    code: "PH-LC-297-JUST-CAUSE",
    article: "297",
    title: "Just cause termination",
    legalBasis: "Labor Code Art. 297 (a)–(l)",
    category: "just_cause",
    monthsPerYear: 0,
    minimumTenureMonths: 0,
    requiresTwinNotice: true,
    requiresDoleAdvanceNotice: false,
  },
  {
    code: "PH-LC-298-AUTHORIZED",
    article: "298",
    title: "Authorized cause — redundancy / retrenchment / closure (not serious business losses)",
    legalBasis: "Labor Code Art. 298 (a)–(d)",
    category: "authorized_cause",
    monthsPerYear: 1,
    minimumTenureMonths: 0,
    requiresTwinNotice: false,
    requiresDoleAdvanceNotice: true,
  },
  {
    code: "PH-LC-299-DISEASE",
    article: "299",
    title: "Authorized cause — disease / illness",
    legalBasis: "Labor Code Art. 299",
    category: "authorized_cause",
    monthsPerYear: 0.5,
    minimumTenureMonths: 0,
    requiresTwinNotice: false,
    requiresDoleAdvanceNotice: true,
  },
  {
    code: "PH-LC-285-CONSTRUCTIVE",
    article: "285",
    title: "Resignation",
    legalBasis: "Labor Code Art. 285",
    category: "authorized_cause",
    monthsPerYear: 0,
    minimumTenureMonths: 0,
    requiresTwinNotice: false,
    requiresDoleAdvanceNotice: false,
  },
];

export function phGrounds(): SeparationGround[] {
  return PH_SEPARATION_GROUNDS;
}

export function phComputeSeparationPay(input: SeparationPayInput): SeparationPayOutput {
  const { monthlySalary, monthsOfService, ground } = input;
  if (ground.monthsPerYear === 0) {
    return {
      eligible: false,
      monthsDue: 0,
      amount: 0,
      reason: `${ground.title} does not carry separation pay`,
    };
  }
  const years = Math.floor(monthsOfService / 12);
  const monthsDue = Math.max(1, years * ground.monthsPerYear);
  const amount = Math.round(monthsDue * monthlySalary * 100) / 100;
  return {
    eligible: true,
    monthsDue,
    amount,
    reason: `${monthsDue} month(s) at ₱${monthlySalary.toLocaleString("en-US")} (${ground.monthsPerYear}/year) — ${ground.legalBasis}`,
  };
}

function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    // Skip Saturdays and Sundays. PH-specific holidays are intentionally NOT
    // subtracted here because the legal deadline is "calendar days" in the
    // Philippines; the 3-day COE rule is also interpreted as business days by
    // common practice, but we use calendar days as the conservative default.
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

function addCalendarDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function phComputeFinalPay(input: FinalPayInput, rulesetVersion: string): FinalPayOutput {
  const { employee, separation, deductions = 0 } = input;
  const missing: string[] = [];
  const components: FinalPayComponent[] = [];

  // 1. Prorata salary for the final period.
  const dailyRate = separation.monthlySalaryForStatutory / PH_PARAMS.workingDaysPerMonth;
  const prorataSalary = Math.round(dailyRate * separation.finalPeriodDaysWorked * 100) / 100;
  components.push({
    code: "PRORATA_SALARY",
    label: "Prorata salary — final period",
    amount: prorataSalary,
  });

  // 2. 13th month pro-rata (PD 851). If caller already computed it, use it.
  // Otherwise we compute with the statutory monthly salary and completed months.
  const sepDate = new Date(employee.separationDate);
  const joinDate = new Date(employee.joinDate);
  let completedMonths =
    (sepDate.getFullYear() - joinDate.getFullYear()) * 12 +
    (sepDate.getMonth() - joinDate.getMonth());
  if (sepDate.getDate() < joinDate.getDate()) completedMonths -= 1;
  completedMonths = Math.max(0, completedMonths);
  const thirteenth =
    input.thirteenthAmount ??
    Math.round((Math.min(completedMonths, 12) / 12) * separation.ytdAnnualGrossEarned * 100) / 100;
  components.push({
    code: "THIRTEENTH_PRORATA",
    label: "13th month pro-rata (PD 851)",
    amount: thirteenth,
  });

  // 3. SIL unused conversion (Art. 95). Fase A boundary: if leave provider is not
  // available, the calculation is explicitly incomplete.
  let silPayout = 0;
  if (separation.leaveAccrual === null) {
    missing.push(
      "LeaveProvider not available — SIL unused balance cannot be converted yet (Fase A)",
    );
  } else if (!separation.leaveAccrual.complete) {
    missing.push(separation.leaveAccrual.missing ?? "Leave accrual incomplete");
  } else {
    silPayout =
      Math.round(
        separation.leaveAccrual.silUnusedDays * separation.leaveAccrual.silDailyRate * 100,
      ) / 100;
    components.push({
      code: "SIL_UNUSED",
      label: `Service Incentive Leave unused — ${separation.leaveAccrual.silUnusedDays} day(s) (Art. 95)`,
      amount: silPayout,
    });
  }

  // 4. Separation pay (if applicable).
  const sepPay = phComputeSeparationPay({
    monthlySalary: separation.monthlySalaryForStatutory,
    monthsOfService: completedMonths,
    ground: separation.ground,
  });
  if (sepPay.amount > 0) {
    components.push({ code: "SEPARATION_PAY", label: sepPay.reason!, amount: sepPay.amount });
  }

  const gross = components.reduce((s, c) => s + c.amount, 0);
  const total = Math.round((gross - deductions) * 100) / 100;
  components.push({
    code: "DEDUCTIONS",
    label: "Deductions / recoverable balances",
    amount: -deductions,
  });

  const dueDate = toIsoDate(addCalendarDays(sepDate, 30)); // DOLE LA 06-20

  return {
    complete: missing.length === 0,
    missing,
    total,
    components,
    dueDate,
    ground: separation.ground,
    rulesetVersion,
  };
}

export function phProcessRequirements(input: SeparationRequirementsInput): SeparationNotice[] {
  const notices: SeparationNotice[] = [];
  const ground = input.ground;
  const processStart = input.processStartDate ? new Date(input.processStartDate) : new Date();
  const sepDate = input.separationDate ? new Date(input.separationDate) : new Date();

  if (ground.requiresTwinNotice) {
    // Twin Notice Rule: NTE (5 calendar days to answer), then hearing/decision.
    notices.push({
      type: "nte",
      dueDate: toIsoDate(addCalendarDays(processStart, 5)),
      label: "Notice to Explain (NTE) — give employee at least 5 days to answer",
      legalBasis: "Labor Code Art. 297 + Procedural Due Process",
      mandatory: true,
    });
    notices.push({
      type: "decision",
      dueDate: toIsoDate(addCalendarDays(processStart, 7)),
      label: "Notice of Decision (termination) after hearing/evaluation",
      legalBasis: "Labor Code Art. 297 + Procedural Due Process",
      mandatory: true,
    });
  }

  if (ground.requiresDoleAdvanceNotice) {
    notices.push({
      type: "dole_advance",
      dueDate: toIsoDate(addCalendarDays(sepDate, -30)),
      label: "30-day advance notice to DOLE Regional Office and affected employee",
      legalBasis: "Labor Code Art. 298 / 299",
      mandatory: true,
    });
  }

  // COE must be issued within 3 days of employee request; we model the due date
  // as 3 business days after the separation date as a practical default.
  notices.push({
    type: "coe",
    dueDate: toIsoDate(addBusinessDays(sepDate, 3)),
    label: "Certificate of Employment (COE) — within 3 days of request",
    legalBasis: "Labor Code Art. 102 / DOLE policy",
    mandatory: false,
  });

  return notices;
}
