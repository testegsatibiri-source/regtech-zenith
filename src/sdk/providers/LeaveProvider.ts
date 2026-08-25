// H22 Phase B — statutory leave contract.
// Leave types are pack-owned (never hardcoded in Core): the provider exposes
// the catalogue, the per-employee entitlement, the cash-conversion rule and the
// employer-funded portion (e.g. PH maternity salary differential).
import type { ProviderContext } from "../context";
import type { LeaveAccrualSnapshot } from "./SeparationProvider";

export type LeaveCategory = "service" | "parental" | "special" | "medical";

export interface LeaveType {
  code: string;
  title: string;
  legalBasis: string;
  category: LeaveCategory;
  /** Statutory number of days granted per cycle (year, event or lifetime). */
  days: number;
  /** Cycle the entitlement resets on. */
  cycle: "annual" | "per_event" | "lifetime";
  /** Whether the leave is paid by the employer. */
  paid: boolean;
  /** Whether unused days convert to cash (only SIL, in PH). */
  convertibleToCash: boolean;
  /** Minimum tenure (months) before the employee qualifies. */
  minTenureMonths: number;
  /** Supporting document the employer must keep on file, if any. */
  requiresProof?: string;
  notes?: string;
}

export interface LeaveSubject {
  employeeId: string;
  fullName: string;
  baseSalary: number;
  joinDate: string;
  /** Optional demographic inputs required by parental/special leaves. */
  sex?: "male" | "female" | null;
  maritalStatus?: string | null;
  soloParent?: boolean;
  /** Number of qualifying children (paternity leave is limited to 4). */
  childrenCount?: number;
  countryMetadata?: Record<string, unknown> | null;
}

export interface LeaveEntitlementInput {
  employee: LeaveSubject;
  /** Reference date (defaults to today in the engine). */
  asOf: string;
  /** Days already used in the current cycle, keyed by leave code. */
  usedDays?: Record<string, number>;
}

export interface LeaveEntitlement {
  code: string;
  title: string;
  legalBasis: string;
  eligible: boolean;
  /** Days granted for this cycle (0 when not eligible). */
  entitledDays: number;
  usedDays: number;
  remainingDays: number;
  paid: boolean;
  convertibleToCash: boolean;
  /** Why the employee is (not) eligible, or what proof is pending. */
  reason: string;
}

export interface LeaveConversionInput {
  code: string;
  unusedDays: number;
  monthlySalary: number;
}

export interface LeaveConversionOutput {
  convertible: boolean;
  days: number;
  dailyRate: number;
  amount: number;
  reason: string;
}

/** Employer-funded top-up on top of a social-security maternity benefit. */
export interface SalaryDifferentialInput {
  monthlySalary: number;
  /** Total benefit advanced by the social-security agency for the leave. */
  agencyBenefit: number;
  /** Leave duration in calendar days. */
  leaveDays: number;
}

export interface SalaryDifferentialOutput {
  fullSalaryForLeave: number;
  agencyBenefit: number;
  /** Employer cost = full salary − agency benefit (never negative). */
  employerCost: number;
  legalBasis: string;
}

export interface LeaveProvider {
  readonly version: string;
  types(ctx?: ProviderContext): LeaveType[];
  entitlement(input: LeaveEntitlementInput, ctx?: ProviderContext): LeaveEntitlement[];
  /** Snapshot consumed by the Separation provider for final pay. */
  accrual(input: LeaveEntitlementInput, ctx?: ProviderContext): LeaveAccrualSnapshot;
  convert(input: LeaveConversionInput, ctx?: ProviderContext): LeaveConversionOutput;
  /** Optional: only countries with an employer top-up implement it. */
  salaryDifferential?(
    input: SalaryDifferentialInput,
    ctx?: ProviderContext,
  ): SalaryDifferentialOutput;
}
