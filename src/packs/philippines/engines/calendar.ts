// PH obligation templates — BIR / SSS / PhilHealth / Pag-IBIG.
import type { ObligationTemplate, CalendarSubject, ObligationOccurrence } from "@/sdk";
import {
  resolvePhMonthlyDeadline,
  resolvePhAnnualDeadline,
  phSubjectFrom,
} from "./deadlines";

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


function lastDay(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function phCalendarTemplates(): ObligationTemplate[] {
  return TEMPLATES.map<ObligationTemplate>((t) => ({
    code: t.code,
    title: t.title,
    category: t.category,
    cadence: t.cadence,
    severity: "high",
    legalBasis: t.legalBasis,
    occurrences: (year: number, subject?: CalendarSubject): ObligationOccurrence[] => {
      const s = phSubjectFrom(subject?.statutoryMetadata, subject?.legalName);
      if (t.cadence === "monthly") {
        const list: ObligationOccurrence[] = [];
        for (let m = 1; m <= 12; m++) {
          const r = resolvePhMonthlyDeadline(t.code, year, m, s);
          list.push({
            period_start: iso(year, m, 1),
            period_end: iso(year, m, lastDay(year, m)),
            due_date: r.dueDate,
            ...(r.statutoryDate ? { statutory_date: r.statutoryDate } : {}),
            resolution: r.status,
            rule: r.rule,
            ...(r.reason ? { reason: r.reason } : {}),
          });
        }
        return list;
      }
      if (t.cadence === "annual") {
        const r = resolvePhAnnualDeadline(
          year + 1,
          t.annualMonth ?? 1,
          t.annualDay ?? 31,
          t.legalBasis ?? "Annual statutory filing",
        );
        return [{
          period_start: iso(year, 1, 1),
          period_end: iso(year, 12, 31),
          due_date: r.dueDate,
          ...(r.statutoryDate ? { statutory_date: r.statutoryDate } : {}),
          resolution: r.status,
          rule: r.rule,
        }];
      }
      return [];
    },
  }));
}
