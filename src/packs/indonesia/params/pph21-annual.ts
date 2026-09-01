// H23-A — Annual PPh 21 parameters (year-end reconciliation).
// TER withholding is only an estimate; the December reconciliation compares the
// sum of monthly TER against the annual progressive liability (UU HPP 7/2021).
//
// Every value carries its legal basis and a source status so a stale/unverified
// parameter never masquerades as official.

export type AnnualSourceStatus = "official" | "media-report" | "stale";

export interface AnnualBracket {
  /** Upper bound of the taxable income slice (PKP), IDR per year. */
  bound: number;
  rate: number;
}

/** UU 7/2021 (HPP) art. 17 — annual progressive brackets on PKP. */
export const ANNUAL_BRACKETS_HPP: readonly AnnualBracket[] = [
  { bound: 60_000_000, rate: 0.05 },
  { bound: 250_000_000, rate: 0.15 },
  { bound: 500_000_000, rate: 0.25 },
  { bound: 5_000_000_000, rate: 0.3 },
] as const;

/** Rate applied above the last bracket (> Rp 5.000.000.000). */
export const ANNUAL_TOP_RATE = 0.35;

export const ANNUAL_BRACKETS_META = {
  key: "id.tax.annualBrackets",
  paramsVersion: "2026.1",
  legalBasis: "UU 7/2021 (HPP) art. 17 ayat (1)",
  sourceStatus: "official" as AnnualSourceStatus,
};

/** PTKP — PMK 101/PMK.010/2016, unchanged by UU HPP. */
export const PTKP_2026 = {
  key: "id.tax.ptkp",
  paramsVersion: "2026.1",
  legalBasis: "PMK 101/PMK.010/2016",
  sourceStatus: "official" as AnnualSourceStatus,
  /** Base allowance for the taxpayer. */
  base: 54_000_000,
  /** Additional allowance for a married taxpayer. */
  married: 4_500_000,
  /** Additional allowance per dependent (max 3). */
  perDependent: 4_500_000,
  maxDependents: 3,
} as const;

/**
 * Biaya jabatan (occupational expense deduction) — 5% of gross,
 * capped at Rp 500.000/month = Rp 6.000.000/year (PMK 250/PMK.03/2008).
 */
export const BIAYA_JABATAN = {
  key: "id.tax.biayaJabatan",
  paramsVersion: "2026.1",
  legalBasis: "PMK 250/PMK.03/2008",
  sourceStatus: "official" as AnnualSourceStatus,
  rate: 0.05,
  annualCap: 6_000_000,
} as const;

/** Parse a PTKP status code such as "TK/0", "K/2", "K/3". */
export function ptkpForStatus(status: string): number {
  const s = status.trim().toUpperCase();
  const match = /^(TK|K)(?:\/(\d))?$/.exec(s);
  if (!match) return PTKP_2026.base;
  const married = match[1] === "K";
  const dependents = Math.min(Number(match[2] ?? 0) || 0, PTKP_2026.maxDependents);
  return PTKP_2026.base + (married ? PTKP_2026.married : 0) + dependents * PTKP_2026.perDependent;
}

/** Annual occupational-expense deduction for a given annual gross. */
export function biayaJabatanFor(annualGross: number): number {
  return Math.min(Math.round(annualGross * BIAYA_JABATAN.rate), BIAYA_JABATAN.annualCap);
}

/** Progressive tax on an annual PKP figure (already net of PTKP). */
export function progressiveAnnualTax(
  taxableIncome: number,
  brackets: readonly AnnualBracket[] = ANNUAL_BRACKETS_HPP,
  topRate: number = ANNUAL_TOP_RATE,
): number {
  let remaining = Math.max(0, taxableIncome);
  let previousBound = 0;
  let tax = 0;
  for (const { bound, rate } of brackets) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, bound - previousBound);
    tax += Math.round(slice * rate);
    remaining -= slice;
    previousBound = bound;
  }
  if (remaining > 0) tax += Math.round(remaining * topRate);
  return tax;
}

export const PPH21_ANNUAL_CONFIG_KEYS = {
  brackets: ANNUAL_BRACKETS_META.key,
  ptkp: PTKP_2026.key,
  biayaJabatan: BIAYA_JABATAN.key,
} as const;
