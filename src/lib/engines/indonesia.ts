// Indonesia Rule Engines: PPh 21 (TER), BPJS, THR + Compliance validators.
import { ID_PARAMS } from "../countryPacks";

// ---------- Tax Engine: PPh 21 via TER (Tarif Efektif Rata-rata, PP 58/2023) ----------

// TER Category A monthly effective-rate table [upperBound, rate]
const TER_A: [number, number][] = [
  [5400000, 0], [5650000, 0.0025], [5950000, 0.005], [6300000, 0.0075],
  [6750000, 0.01], [7500000, 0.0125], [8550000, 0.015], [9650000, 0.0175],
  [10050000, 0.02], [10350000, 0.0225], [10700000, 0.025], [11050000, 0.03],
  [11600000, 0.035], [12500000, 0.04], [13750000, 0.05], [15100000, 0.06],
  [16950000, 0.07], [19750000, 0.08], [24150000, 0.09], [26450000, 0.1],
  [28000000, 0.11], [30050000, 0.12], [32400000, 0.13], [35400000, 0.14],
  [39100000, 0.15], [43850000, 0.16], [47800000, 0.17], [51400000, 0.18],
  [56300000, 0.19], [62200000, 0.2], [68600000, 0.21], [77500000, 0.22],
  [89000000, 0.23], [103000000, 0.24], [125000000, 0.25], [157000000, 0.26],
  [206000000, 0.27], [337000000, 0.28], [454000000, 0.29], [550000000, 0.3],
  [695000000, 0.31], [910000000, 0.32], [1400000000, 0.33],
];

// Zero-tax thresholds per TER category (below this = 0%)
const TER_ZERO: Record<"A" | "B" | "C", number> = {
  A: 5400000,
  B: 6200000,
  C: 6600000,
};

export function terCategory(maritalStatus: string): "A" | "B" | "C" {
  const s = maritalStatus.toUpperCase();
  if (["TK/0", "TK/1", "K/0"].includes(s)) return "A";
  if (["TK/2", "TK/3", "K/1", "K/2"].includes(s)) return "B";
  return "C"; // K/3
}

export function terRate(monthlyGross: number, category: "A" | "B" | "C"): number {
  if (monthlyGross <= TER_ZERO[category]) return 0;
  for (const [bound, rate] of TER_A) {
    if (monthlyGross <= bound) return rate;
  }
  return 0.34;
}

export interface TaxInput {
  monthlyGross: number;
  maritalStatus: string;
  hasNpwp?: boolean;
}
export interface TaxResult {
  category: "A" | "B" | "C";
  rate: number;
  tax: number;
  npwpSurcharge: number;
}

export function calculateTax({ monthlyGross, maritalStatus, hasNpwp = true }: TaxInput): TaxResult {
  const category = terCategory(maritalStatus);
  const rate = terRate(monthlyGross, category);
  let tax = Math.round(monthlyGross * rate);
  // No NPWP => 20% higher PPh 21
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
}
export interface Payslip {
  gross: number;
  tax: TaxResult;
  bpjs: BpjsResult;
  net: number;
  employerCost: number;
}
export function buildPayslip({ baseSalary, allowances = 0, maritalStatus, hasNpwp = true }: PayslipInput): Payslip {
  const gross = baseSalary + allowances;
  const tax = calculateTax({ monthlyGross: gross, maritalStatus, hasNpwp });
  const bpjs = calculateBpjs(baseSalary);
  const net = gross - tax.tax - bpjs.employee.total;
  const employerCost = gross + bpjs.employer.total;
  return { gross, tax, bpjs, net, employerCost };
}

export function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}
