// H5 — Indonesia CountryPack (SDK). Wraps existing rule engines as providers.
import type { CountryPack, Providers } from "@/sdk/CountryPack";
import type { CountryManifest } from "@/sdk/manifest";
import type { Capability } from "@/sdk/Capability";
import type { TaxProvider } from "@/sdk/providers/TaxProvider";
import type { BenefitsProvider } from "@/sdk/providers/BenefitsProvider";
import type { PayrollProvider } from "@/sdk/providers/PayrollProvider";
import type { ThirteenthProvider } from "@/sdk/providers/ThirteenthProvider";
import type { CalendarProvider, ObligationTemplate } from "@/sdk/providers/CalendarProvider";
import type { ContractProvider } from "@/sdk/providers/ContractProvider";
import type { RuleProvider } from "@/sdk/providers/RuleProvider";
import type { AuditProvider } from "@/sdk/providers/AuditProvider";

import { ID_PARAMS } from "@/lib/countryPacks";
import { calculateTax, calculateBpjs, calculateThr, buildPayslip } from "@/lib/engines/indonesia";
import { indonesiaPack as legacyEnginesPack } from "@/lib/engines/id-pack";
import { ID_OBLIGATIONS, computeDueDate } from "@/lib/obligations.catalog";
import { evaluateContract } from "@/lib/engines/contracts";


const manifest: CountryManifest = {
  country: "ID",
  name: "Indonesia",
  currency: "IDR",
  version: "1.7.0",
  rulesetVersion: legacyEnginesPack.rulesetVersion,
  engines: ["payroll", "tax", "benefits", "thirteenth", "overtime", "calendar", "contracts", "audit", "rules"],
  supportedLanguages: ["id", "en"],
  requiresCore: ">=2.0.0",
};

const tax: TaxProvider = {
  calculate: (input) => {
    const r = calculateTax(input);
    return { category: r.category, rate: r.rate, tax: r.tax, surcharge: r.npwpSurcharge };
  },
};

const benefits: BenefitsProvider = {
  calculate: ({ salary }) => {
    const r = calculateBpjs(salary);
    return {
      employee: { ...r.employee } as Record<string, number> & { total: number },
      employer: { ...r.employer } as Record<string, number> & { total: number },
    };
  },
};

const thirteenth: ThirteenthProvider = { calculate: (input) => calculateThr(input) };

const payroll: PayrollProvider = {
  buildPayslip: (input) => {
    const p = buildPayslip(input);
    return {
      gross: p.gross,
      tax: { category: p.tax.category, rate: p.tax.rate, tax: p.tax.tax, surcharge: p.tax.npwpSurcharge },
      benefits: {
        employee: { ...p.bpjs.employee } as Record<string, number> & { total: number },
        employer: { ...p.bpjs.employer } as Record<string, number> & { total: number },
      },
      net: p.net,
      employerCost: p.employerCost,
    };
  },
};

const calendar: CalendarProvider = {
  templates: () =>
    ID_OBLIGATIONS.map<ObligationTemplate>((t) => ({
      code: t.code,
      title: t.name,
      category: t.category,
      cadence: (t.frequency === "one_off" ? "one_off" : t.frequency) as ObligationTemplate["cadence"],
      severity: "high",
      legalBasis: t.base_legal,
      occurrences: (year: number) => {
        const list: { period_start: string; period_end: string; due_date: string }[] = [];
        if (t.frequency === "monthly") {
          for (let m = 1; m <= 12; m++) {
            const period_start = `${year}-${String(m).padStart(2, "0")}-01`;
            const period_end = period_start;
            list.push({ period_start, period_end, due_date: computeDueDate(t, year, m) });
          }
        } else if (t.frequency === "annual") {
          list.push({
            period_start: `${year}-01-01`,
            period_end: `${year}-12-31`,
            due_date: computeDueDate(t, year, 1),
          });
        } else if (t.frequency === "quarterly") {
          for (const m of [3, 6, 9, 12]) {
            list.push({
              period_start: `${year}-${String(m - 2).padStart(2, "0")}-01`,
              period_end: `${year}-${String(m).padStart(2, "0")}-01`,
              due_date: computeDueDate(t, year, m),
            });
          }
        }
        return list;
      },
    })),
};


const contracts: ContractProvider = {
  validate: (c) => validateContract(c),
  coverage: (activeEmployees, activeContracts) => {
    if (activeEmployees === 0) return 100;
    return Math.round((Math.min(activeContracts, activeEmployees) / activeEmployees) * 100);
  },
};

const rules: RuleProvider = { rules: () => legacyEnginesPack.complianceRules };

const audit: AuditProvider = {
  heuristics: () => [],
};

const providers: Providers = { tax, benefits, payroll, thirteenth, calendar, contracts, rules, audit };

export const indonesiaPack: CountryPack = {
  manifest,
  params: ID_PARAMS as unknown as Record<string, unknown>,
  providers,
  supports: (c: Capability) => manifest.engines.includes(c),
};
