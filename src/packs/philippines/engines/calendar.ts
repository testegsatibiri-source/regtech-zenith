// PH obligation templates — BIR / SSS / PhilHealth / Pag-IBIG.
import type { ObligationTemplate } from "@/sdk";

interface Template {
  code: string;
  title: string;
  category: string;
  cadence: ObligationTemplate["cadence"];
  legalBasis: string;
  monthlyDueDay?: number; // day of following month
  annualMonth?: number;   // 1-12
  annualDay?: number;
}

const TEMPLATES: Template[] = [
  {
    code: "BIR-1601C",
    title: "BIR Form 1601-C — Monthly Withholding Tax on Compensation",
    category: "tax",
    cadence: "monthly",
    legalBasis: "NIRC §79 / RR 11-2018",
    monthlyDueDay: 10,
  },
  {
    code: "SSS-R5",
    title: "SSS Contribution Payment (R-5)",
    category: "benefits",
    cadence: "monthly",
    legalBasis: "RA 11199 (SSS Act 2018)",
    monthlyDueDay: 30,
  },
  {
    code: "PHIC-RF1",
    title: "PhilHealth Premium Remittance (RF-1)",
    category: "benefits",
    cadence: "monthly",
    legalBasis: "RA 11223 (UHC Act)",
    monthlyDueDay: 15,
  },
  {
    code: "HDMF-MCRF",
    title: "Pag-IBIG Contribution (MCRF)",
    category: "benefits",
    cadence: "monthly",
    legalBasis: "RA 9679 (HDMF Law)",
    monthlyDueDay: 10,
  },
  {
    code: "BIR-2316",
    title: "BIR 2316 — Certificate of Compensation Payment/Tax Withheld",
    category: "tax",
    cadence: "annual",
    legalBasis: "RR 2-2015",
    annualMonth: 1,
    annualDay: 31,
  },
  {
    code: "BIR-1604C",
    title: "BIR 1604-C — Annual Information Return (Alphalist)",
    category: "tax",
    cadence: "annual",
    legalBasis: "RR 11-2018",
    annualMonth: 1,
    annualDay: 31,
  },
];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function phCalendarTemplates(): ObligationTemplate[] {
  return TEMPLATES.map<ObligationTemplate>((t) => ({
    code: t.code,
    title: t.title,
    category: t.category,
    cadence: t.cadence,
    severity: "high",
    legalBasis: t.legalBasis,
    occurrences: (year: number) => {
      if (t.cadence === "monthly") {
        const list: { period_start: string; period_end: string; due_date: string }[] = [];
        for (let m = 1; m <= 12; m++) {
          const dueMonth = m === 12 ? 1 : m + 1;
          const dueYear = m === 12 ? year + 1 : year;
          list.push({
            period_start: iso(year, m, 1),
            period_end: iso(year, m, 28),
            due_date: iso(dueYear, dueMonth, t.monthlyDueDay ?? 15),
          });
        }
        return list;
      }
      if (t.cadence === "annual") {
        return [{
          period_start: iso(year, 1, 1),
          period_end: iso(year, 12, 31),
          due_date: iso(year + 1, t.annualMonth ?? 1, t.annualDay ?? 31),
        }];
      }
      return [];
    },
  }));
}
