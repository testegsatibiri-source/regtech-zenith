// Indonesia regulatory obligations catalog — Country Pack layer.
// Templates for recurring compliance events. Real dates are materialised
// per company by the seedObligations server function.

export type ObligationFrequency = "monthly" | "quarterly" | "annual" | "one_off";
export type ObligationCategory = "tax" | "labor" | "bpjs" | "other";

export interface ObligationTemplate {
  code: string;
  name: string;
  category: ObligationCategory;
  frequency: ObligationFrequency;
  base_legal: string;
  /** Day of month for monthly/quarterly obligations (1-31). */
  dueDay?: number;
  /** For monthly: 0 = same period-month, 1 = following month. */
  monthOffset?: number;
  /** For annual: fixed month/day of due date. */
  annualMonth?: number; // 1-12
  annualDay?: number;
  notes?: string;
}

export const ID_OBLIGATIONS: ObligationTemplate[] = [
  {
    code: "ID-PPH21-PAY",
    name: "PPh 21 — Withholding tax payment (SSP)",
    category: "tax",
    frequency: "monthly",
    base_legal: "UU PPh 36/2008; PMK 168/2023",
    dueDay: 10,
    monthOffset: 1,
    notes: "Payment via e-Billing DJP for the previous month's PPh 21.",
  },
  {
    code: "ID-PPH21-SPT",
    name: "SPT Masa PPh 21 filing",
    category: "tax",
    frequency: "monthly",
    base_legal: "PMK 168/2023",
    dueDay: 20,
    monthOffset: 1,
    notes: "e-Filing DJP (form 1721) for the previous month.",
  },
  {
    code: "ID-BPJS-HEALTH",
    name: "BPJS Kesehatan contribution payment",
    category: "bpjs",
    frequency: "monthly",
    base_legal: "Perpres 82/2018",
    dueDay: 10,
    monthOffset: 1,
  },
  {
    code: "ID-BPJS-TK",
    name: "BPJS Ketenagakerjaan contribution payment",
    category: "bpjs",
    frequency: "monthly",
    base_legal: "PP 44/2015; PP 45/2015",
    dueDay: 15,
    monthOffset: 1,
  },
  {
    code: "ID-LKPM",
    name: "LKPM — Investment activity report (BKPM)",
    category: "other",
    frequency: "quarterly",
    base_legal: "Perka BKPM 5/2021",
    dueDay: 10,
    monthOffset: 1,
    notes: "Due within 10 days after each quarter (Apr/Jul/Oct/Jan).",
  },
  {
    code: "ID-SPT-1721-A1",
    name: "SPT Tahunan PPh 21 (form 1721-A1)",
    category: "tax",
    frequency: "annual",
    base_legal: "UU PPh 36/2008",
    annualMonth: 3,
    annualDay: 31,
  },
  {
    code: "ID-SPT-BADAN",
    name: "SPT Tahunan PPh Badan (corporate income tax)",
    category: "tax",
    frequency: "annual",
    base_legal: "UU KUP 28/2007",
    annualMonth: 4,
    annualDay: 30,
  },
  {
    code: "ID-WLKP",
    name: "WLKP — Wajib Lapor Ketenagakerjaan Perusahaan",
    category: "labor",
    frequency: "annual",
    base_legal: "UU 7/1981",
    annualMonth: 12,
    annualDay: 31,
    notes: "Online report to Kemnaker (wajiblapor.kemnaker.go.id).",
  },
  {
    code: "ID-THR",
    name: "THR — Religious Holiday Allowance payment",
    category: "labor",
    frequency: "annual",
    base_legal: "PP 36/2021; Permenaker 6/2016",
    // Eid al-Fitr 1447H falls on ~2026-03-20; THR due 7 days prior.
    // Approximated; refined by the THR engine per year.
    annualMonth: 3,
    annualDay: 13,
    notes: "Must be paid at least 7 days before the religious holiday (Eid).",
  },
];

/** Build one materialised due date for a template within a given period. */
export function computeDueDate(
  tpl: ObligationTemplate,
  periodYear: number,
  periodMonth: number, // 1-12
): Date {
  if (tpl.frequency === "annual" && tpl.annualMonth && tpl.annualDay) {
    return new Date(Date.UTC(periodYear, tpl.annualMonth - 1, tpl.annualDay));
  }
  const offset = tpl.monthOffset ?? 0;
  const day = tpl.dueDay ?? 1;
  const target = new Date(Date.UTC(periodYear, periodMonth - 1 + offset, day));
  return target;
}

/** Build the human-readable period label. */
export function periodLabel(tpl: ObligationTemplate, year: number, month: number): string {
  if (tpl.frequency === "annual") return String(year);
  if (tpl.frequency === "quarterly") {
    const q = Math.ceil(month / 3);
    return `Q${q} ${year}`;
  }
  return `${String(month).padStart(2, "0")}/${year}`;
}
