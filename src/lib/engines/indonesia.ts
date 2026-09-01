// Indonesia Rule Engines: PPh 21 (TER), BPJS, THR, overtime + Compliance validators.
// H11.1a — TER tables no longer embedded here; they arrive as parameters from
// the Country Pack (StaticConfigProvider). Historical exports remain valid
// because we resolve default tables from the pack params for legacy call sites.
// H23-A — BPJS parameters are now sourced from `BPJS_2026` with sourceStatus
// tracking; legacy `ID_PARAMS.bpjs` is kept for backwards compatibility.
import { ID_PARAMS } from "../countryPacks";
import { TER_TABLES, type TerTable } from "@/packs/indonesia/params/ter-tables";
import { BPJS_2026, type BpjsParams } from "@/packs/indonesia/params/bpjs-2026";
import {
  ANNUAL_BRACKETS_HPP,
  ANNUAL_TOP_RATE,
  PTKP_2026,
  ptkpForStatus,
  biayaJabatanFor,
  progressiveAnnualTax,
} from "@/packs/indonesia/params/pph21-annual";

// ---------- Tax Engine: PPh 21 via TER (Tarif Efektif Rata-rata, PP 58/2023) ----------

export function terCategory(maritalStatus: string): "A" | "B" | "C" {
  const s = maritalStatus.toUpperCase();
  if (["TK/0", "TK/1", "K/0"].includes(s)) return "A";
  if (["TK/2", "TK/3", "K/1", "K/2"].includes(s)) return "B";
  return "C"; // K/3
}

export function terRate(monthlyGross: number, category: "A" | "B" | "C", table?: TerTable): number {
  const t = table ?? TER_TABLES[category];
  if (monthlyGross <= t.zeroThreshold) return 0;
  for (const [bound, rate] of t.brackets) {
    if (monthlyGross <= bound) return rate;
  }
  return t.topRate;
}

export interface TaxInput {
  monthlyGross: number;
  maritalStatus: string;
  hasNpwp?: boolean;
  /** Optional injected TER tables (from ConfigService). Falls back to defaults. */
  tables?: Record<"A" | "B" | "C", TerTable>;
}
export interface TaxResult {
  category: "A" | "B" | "C";
  rate: number;
  tax: number;
  npwpSurcharge: number;
}

export function calculateTax({
  monthlyGross,
  maritalStatus,
  hasNpwp = true,
  tables,
}: TaxInput): TaxResult {
  const category = terCategory(maritalStatus);
  const table = (tables ?? TER_TABLES)[category];
  const rate = terRate(monthlyGross, category, table);
  let tax = Math.round(monthlyGross * rate);
  const npwpSurcharge = hasNpwp ? 0 : Math.round(tax * 0.2);
  tax += npwpSurcharge;
  return { category, rate, tax, npwpSurcharge };
}

// ---------- BPJS Engine ----------
export type BpjsRiskLevelCode = "very-low" | "low" | "medium" | "high" | "very-high";

export interface BpjsResult {
  employee: { health: number; jht: number; jp: number; total: number };
  employer: {
    health: number;
    jht: number;
    jp: number;
    jkk: number;
    jkm: number;
    jkp: number;
    total: number;
  };
  /** Optional JKP (Job Loss Guarantee) — funded by government + recomposition. */
  jkp?: { government: number; jkkRecomposition: number; jkmRecomposition: number; total: number };
  /** Source status of the parameters used; non-official values are still computed honestly. */
  sourceStatus?: Record<string, "official" | "media-report" | "stale">;
}

export interface BpjsInput {
  salary: number;
  /** Default risk level for JKK when none is supplied. */
  jkkRiskLevel?: BpjsRiskLevelCode;
  /** Optional injected parameters (from ConfigService). Falls back to BPJS_2026. */
  params?: BpjsParams;
  /** Include JKP in the result. Defaults to false (optional program). */
  includeJkp?: boolean;
}

export function calculateBpjs(input: BpjsInput | number): BpjsResult {
  const {
    salary,
    jkkRiskLevel = "very-low",
    params = BPJS_2026,
    includeJkp = false,
  } = typeof input === "number" ? { salary: input } : input;
  const healthBase = Math.min(salary, params.health.cap);
  const jpBase = Math.min(salary, params.jp.cap);
  const eHealth = Math.round(healthBase * params.health.employeeRate);
  const eJht = Math.round(salary * params.jht.employeeRate);
  const eJp = Math.round(jpBase * params.jp.employeeRate);
  const rHealth = Math.round(healthBase * params.health.employerRate);
  const rJht = Math.round(salary * params.jht.employerRate);
  const rJp = Math.round(jpBase * params.jp.employerRate);
  const jkkRate =
    params.jkk.riskLevels.find((r) => r.code === jkkRiskLevel)?.employerRate ??
    params.jkk.riskLevels[0].employerRate;
  const rJkk = Math.round(salary * jkkRate);
  const rJkm = Math.round(salary * params.jkm.employerRate);

  const result: BpjsResult = {
    employee: { health: eHealth, jht: eJht, jp: eJp, total: eHealth + eJht + eJp },
    employer: {
      health: rHealth,
      jht: rJht,
      jp: rJp,
      jkk: rJkk,
      jkm: rJkm,
      jkp: 0,
      total: rHealth + rJht + rJp + rJkk + rJkm,
    },
    sourceStatus: {
      health: params.health.sourceStatus,
      jht: params.jht.sourceStatus,
      jp: params.jp.sourceStatus,
      jkk: params.jkk.sourceStatus,
      jkm: params.jkm.sourceStatus,
    },
  };

  if (includeJkp) {
    const gov = Math.round(salary * params.jkp.governmentRate);
    const jkkRec = Math.round(salary * params.jkp.jkkRecomposition);
    const jkmRec = Math.round(salary * params.jkp.jkmRecomposition);
    result.jkp = {
      government: gov,
      jkkRecomposition: jkkRec,
      jkmRecomposition: jkmRec,
      total: gov + jkkRec + jkmRec,
    };
    result.employer.jkp = jkkRec + jkmRec;
    result.employer.total += jkkRec + jkmRec;
    result.sourceStatus!.jkp = params.jkp.sourceStatus;
  }

  return result;
}

import {
  thrDueDateForReligion,
  type Religion,
  type ThrDueResolution,
} from "@/packs/indonesia/params/religious-holidays";

// ---------- THR Engine (13th religious pay) ----------
export interface ThrInput {
  monthlySalary: number;
  monthsOfService: number; // full months worked
  /** H23-B — declared religion drives the statutory deadline (PP 36/2021 art. 9). */
  religion?: Religion;
  /** Year of the THR cycle; defaults to the current year. */
  year?: number;
}
export interface ThrResult {
  eligible: boolean;
  amount: number;
  prorated: boolean;
  /** Present when a religion is declared: deadline + provenance. */
  due?: ThrDueResolution;
}
export function calculateThr({
  monthlySalary,
  monthsOfService,
  religion,
  year,
}: ThrInput): ThrResult {
  const due = religion
    ? thrDueDateForReligion(religion, year ?? new Date().getUTCFullYear())
    : undefined;
  const base: ThrResult =
    monthsOfService < 1
      ? { eligible: false, amount: 0, prorated: false }
      : monthsOfService >= 12
        ? { eligible: true, amount: Math.round(monthlySalary), prorated: false }
        : {
            eligible: true,
            amount: Math.round((monthsOfService / 12) * monthlySalary),
            prorated: true,
          };
  return due ? { ...base, due } : base;
}

// ---------- Full payslip ----------
export interface PayslipInput {
  baseSalary: number;
  allowances?: number;
  maritalStatus: string;
  hasNpwp?: boolean;
  tables?: Record<"A" | "B" | "C", TerTable>;
}
export interface Payslip {
  gross: number;
  tax: TaxResult;
  bpjs: BpjsResult;
  net: number;
  employerCost: number;
}
export function buildPayslip({
  baseSalary,
  allowances = 0,
  maritalStatus,
  hasNpwp = true,
  tables,
}: PayslipInput): Payslip {
  const gross = baseSalary + allowances;
  const tax = calculateTax({ monthlyGross: gross, maritalStatus, hasNpwp, tables });
  const bpjs = calculateBpjs(baseSalary);
  const net = gross - tax.tax - bpjs.employee.total;
  const employerCost = gross + bpjs.employer.total;
  return { gross, tax, bpjs, net, employerCost };
}

export function monthsBetween(from: Date, to: Date): number {
  return Math.max(
    0,
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()),
  );
}

// ---------- Annual PPh 21 reconciliation (H23-A) ----------
// Monthly TER is an estimate; year-end reconciliation compares the sum of
// monthly TER withholdings against the annual progressive tax liability
// (UU HPP 7/2021 art. 17). A positive `underpaid` means the employer must
// withhold the difference in December; a negative value means a refund/offset.
export interface AnnualReconciliationInput {
  year: number;
  /** Sum of monthly gross salaries across the year. */
  annualGross: number;
  /** Sum of PPh 21 already withheld via TER each month. */
  withheldTerTotal: number;
  /** Annual progressive tax brackets. Defaults to UU HPP art. 17. */
  annualBrackets?: { bound: number; rate: number }[];
  /** Explicit PTKP override; takes precedence over `maritalStatus`. */
  ptkp?: number;
  /** PTKP status code (TK/0 … K/3) used to derive the allowance. */
  maritalStatus?: string;
  /** Apply biaya jabatan (5%, capped Rp 6.000.000/year). Default false for
   *  backwards compatibility with gross-only call sites. */
  applyOccupationalAllowance?: boolean;
  /** Deductible employee contributions for the year (JHT 2% + JP 1%). */
  deductibleContributions?: number;
}

export interface AnnualReconciliationResult {
  annualTaxableIncome: number;
  annualTaxLiability: number;
  withheldTerTotal: number;
  underpaid: number;
  /** Breakdown of the statutory deductions applied. */
  deductions: { ptkp: number; occupationalAllowance: number; contributions: number };
  legalBasis: string;
  message: string;
}

export function reconcileAnnualPph21({
  annualGross,
  withheldTerTotal,
  annualBrackets,
  ptkp,
  maritalStatus,
  applyOccupationalAllowance = false,
  deductibleContributions = 0,
}: AnnualReconciliationInput): AnnualReconciliationResult {
  const brackets = annualBrackets ?? ANNUAL_BRACKETS_HPP;
  const allowance = ptkp ?? (maritalStatus ? ptkpForStatus(maritalStatus) : PTKP_2026.base);
  const occupational = applyOccupationalAllowance ? biayaJabatanFor(annualGross) : 0;
  const netIncome = Math.max(0, annualGross - occupational - deductibleContributions);
  const annualTaxableIncome = Math.max(0, netIncome - allowance);
  const annualTaxLiability = progressiveAnnualTax(annualTaxableIncome, brackets, ANNUAL_TOP_RATE);
  const underpaid = annualTaxLiability - withheldTerTotal;
  return {
    annualTaxableIncome,
    annualTaxLiability,
    withheldTerTotal,
    underpaid,
    deductions: {
      ptkp: allowance,
      occupationalAllowance: occupational,
      contributions: deductibleContributions,
    },
    legalBasis: "UU 7/2021 (HPP) art. 17; PMK 101/2016 (PTKP); PMK 250/2008 (biaya jabatan)",
    message:
      underpaid > 0
        ? `Annual liability exceeds withheld TER by ${underpaid.toLocaleString("id-ID")}; collect in December.`
        : `Annual liability reconciled; ${Math.abs(underpaid).toLocaleString("id-ID")} over-withheld (refund/offset).`,
  };
}

// Re-export overtime engine from the pack for convenience.
export {
  thrDueDateForReligion,
  resolveThrHoliday,
  RELIGIONS,
} from "@/packs/indonesia/params/religious-holidays";
export type { Religion, ThrDueResolution } from "@/packs/indonesia/params/religious-holidays";
export { calculateOvertime } from "@/packs/indonesia/engines/overtime";
export type {
  OvertimeInput,
  OvertimeResult,
  WorkWeekPattern,
  DayType,
} from "@/packs/indonesia/engines/overtime";
