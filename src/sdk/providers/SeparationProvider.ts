import type { ProviderContext } from "../context";

export interface SeparationGround {
  code: string;
  article: string;
  title: string;
  legalBasis: string;
  category: "just_cause" | "authorized_cause";
  /** Separation-pay multiplier: 1.0 = one month per year; 0.5 = half month. */
  monthsPerYear: 0 | 0.5 | 1;
  /** Minimum tenure (in months) to qualify for separation pay. */
  minimumTenureMonths: number;
  /** Whether the employer must serve the Twin Notice (NTE + decision). */
  requiresTwinNotice: boolean;
  /** Whether DOLE requires 30-day advance notice for authorized-cause cases. */
  requiresDoleAdvanceNotice: boolean;
}

export interface SeparationPayInput {
  /** Last monthly basic salary (or average for the last 12 months, if available). */
  monthlySalary: number;
  /** Complete months of service, rounded down. */
  monthsOfService: number;
  ground: SeparationGround;
}

export interface SeparationPayOutput {
  eligible: boolean;
  /** Number of months of pay due (rounded to 0.5 increments). */
  monthsDue: number;
  amount: number;
  /** Reason the pay was denied or reduced. */
  reason?: string;
}

/** Accrual snapshot supplied by the Leave provider (or a placeholder in Fase A). */
export interface LeaveAccrualSnapshot {
  /** Days of unused Service Incentive Leave (SIL) convertible to cash. */
  silUnusedDays: number;
  /** Cash value of one SIL day. */
  silDailyRate: number;
  /** Whether the snapshot is complete enough to use in final pay. */
  complete: boolean;
  /** If false, explains why it cannot be used yet. */
  missing?: string;
}

export interface FinalPayInput {
  employee: {
    employeeId: string;
    fullName: string;
    baseSalary: number;
    joinDate: string;
    separationDate: string;
    countryMetadata?: Record<string, unknown> | null;
  };
  separation: {
    ground: SeparationGround;
    /** Monthly gross used for the 13th-month / prorata base. */
    monthlySalaryForStatutory: number;
    /** YTD gross earnings for the current calendar year. */
    ytdAnnualGrossEarned: number;
    /** Days worked in the final pay period. */
    finalPeriodDaysWorked: number;
    /** Days in the final pay period. */
    finalPeriodDays: number;
    /** Accrued leave snapshot. Fase A allows null to signal incompleteness. */
    leaveAccrual: LeaveAccrualSnapshot | null;
  };
  /** 13th-month prorata amount if already computed; otherwise the provider may compute it. */
  thirteenthAmount?: number;
  /** Optional deduction balance (e.g. loans, advances). */
  deductions?: number;
}

export interface FinalPayComponent {
  code: string;
  label: string;
  amount: number;
}

export interface FinalPayOutput {
  /** True only when no required input is missing or incomplete. */
  complete: boolean;
  /** Items that are missing; if non-empty, complete is false. */
  missing: string[];
  /** Total amount due to the employee. */
  total: number;
  /** Line-item breakdown. */
  components: FinalPayComponent[];
  /** Legal deadline for payment (DOLE LA 06-20: 30 days from separation). */
  dueDate: string;
  /** Ground used for the computation. */
  ground: SeparationGround;
  /** Ruleset version that produced the computation. */
  rulesetVersion: string;
}

export interface SeparationNotice {
  type: "nte" | "decision" | "dole_advance" | "coe";
  /** ISO date by which the document must be served/delivered. */
  dueDate: string;
  /** Human-readable description of the notice. */
  label: string;
  /** Legal basis. */
  legalBasis: string;
  /** Whether the document is mandatory for this ground. */
  mandatory: boolean;
}

export interface SeparationRequirementsInput {
  ground: SeparationGround;
  /** Date the separation process was opened (e.g. NTE served). */
  processStartDate?: string;
  /** Date of separation (last day of work). */
  separationDate?: string;
}

export interface SeparationProvider {
  readonly version: string;
  grounds(ctx?: ProviderContext): SeparationGround[];
  computeSeparationPay(input: SeparationPayInput, ctx?: ProviderContext): SeparationPayOutput;
  computeFinalPay(input: FinalPayInput, ctx?: ProviderContext): FinalPayOutput;
  processRequirements(input: SeparationRequirementsInput, ctx?: ProviderContext): SeparationNotice[];
}
