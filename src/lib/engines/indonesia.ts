// Indonesia Rule Engines: PPh 21 (TER), BPJS, THR + Compliance validators.
// H11.1a — TER tables no longer embedded here; they arrive as parameters from
// the Country Pack (StaticConfigProvider). Historical exports remain valid
// because we resolve default tables from the pack params for legacy call sites.
import { ID_PARAMS } from "../countryPacks";
import { TER_TABLES, type TerTable } from "@/packs/indonesia/params/ter-tables";

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

export function calculateTax({ monthlyGross, maritalStatus, hasNpwp = true, tables }: TaxInput): TaxResult {
  const category = terCategory(maritalStatus);
  const table = (tables ?? TER_TABLES)[category];
  const rate = terRate(monthlyGross, category, table);
  let tax = Math.round(monthlyGross * rate);
  const npwpSurcharge = hasNpwp ? 0 : Math.round(tax * 0.2);
  tax += npwpSurcharge;
  return { category, rate, tax, npwpSurcharge };
}

// ---------- BPJS Engine ----------
export interface BpjsResult {
  employee: { health: number; jht: number; jp: number; total: number };
  employer: { health: number; jht: number; jp: number; jkk: number; jkm: number; total: number };
}

export function calculateBpjs(salary: number): BpjsResult {
  const p = ID_PARAMS.bpjs;
  const healthBase = Math.min(salary, p.healthCap);
  const jpBase = Math.min(salary, p.jpCap);
  const eHealth = Math.round(healthBase * p.health.employee);
  const eJht = Math.round(salary * p.jht.employee);
  const eJp = Math.round(jpBase * p.jp.employee);
  const rHealth = Math.round(healthBase * p.health.employer);
  const rJht = Math.round(salary * p.jht.employer);
  const rJp = Math.round(jpBase * p.jp.employer);
  const rJkk = Math.round(salary * p.jkk);
  const rJkm = Math.round(salary * p.jkm);
  return {
    employee: { health: eHealth, jht: eJht, jp: eJp, total: eHealth + eJht + eJp },
    employer: {
      health: rHealth, jht: rJht, jp: rJp, jkk: rJkk, jkm: rJkm,
      total: rHealth + rJht + rJp + rJkk + rJkm,
    },
  };
}

// ---------- THR Engine (13th religious pay) ----------
export interface ThrInput {
  monthlySalary: number;
  monthsOfService: number; // full months worked
}
export interface ThrResult {
  eligible: boolean;
  amount: number;
  prorated: boolean;
}
export function calculateThr({ monthlySalary, monthsOfService }: ThrInput): ThrResult {
  if (monthsOfService < 1) return { eligible: false, amount: 0, prorated: false };
  if (monthsOfService >= 12) return { eligible: true, amount: Math.round(monthlySalary), prorated: false };
  return { eligible: true, amount: Math.round((monthsOfService / 12) * monthlySalary), prorated: true };
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
export function buildPayslip({ baseSalary, allowances = 0, maritalStatus, hasNpwp = true, tables }: PayslipInput): Payslip {
  const gross = baseSalary + allowances;
  const tax = calculateTax({ monthlyGross: gross, maritalStatus, hasNpwp, tables });
  const bpjs = calculateBpjs(baseSalary);
  const net = gross - tax.tax - bpjs.employee.total;
  const employerCost = gross + bpjs.employer.total;
  return { gross, tax, bpjs, net, employerCost };
}

export function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}
