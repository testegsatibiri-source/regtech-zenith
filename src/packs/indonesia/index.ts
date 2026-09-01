// H5/H6/H11.1a — Indonesia CountryPack. v1.9.0 with:
//   • paramsVersion 2026.1 (TER B/C tables + UMP 2026)
//   • interfaceVersion 1.0.0 (frozen)
//   • signatureBlock (author + platform countersign)
//   • ConfigService-driven params
import type { CountryPack, Providers, HealthReport } from "@/sdk/CountryPack";
import type { CountryManifest, SignatureBlock } from "@/sdk/manifest";
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
import type { BpjsRiskLevelCode } from "@/lib/engines/indonesia";
import { indonesiaPack as legacyEnginesPack } from "@/lib/engines/id-pack";
import { ID_OBLIGATIONS, computeDueDate, registerThrDueResolver } from "@/lib/obligations.catalog";
import { evaluateContract } from "@/lib/engines/contracts";

import { TER_TABLES } from "./params/ter-tables";
import { thrDueDate } from "./params/eid-al-fitr";
import { buildIndonesiaParamsMap } from "./params";
import { ID_SIGNATURE_BLOCK } from "./signature";

// Eagerly register the THR calendar resolver so obligations.catalog can
// answer due dates without waiting on a dynamic import.
registerThrDueResolver(thrDueDate);

const PROVIDES: Capability[] = [
  "payroll", "tax", "benefits", "thirteenth", "overtime",
  "calendar", "contracts", "audit", "rules",
];

const RULESET_VERSION = "ID-2026.2";
const PACK_VERSION = "2.0.0";

const manifest: CountryManifest = {
  country: "ID",
  name: "Indonesia",
  currency: "IDR",
  version: PACK_VERSION,
  rulesetVersion: RULESET_VERSION,
  interfaceVersion: "1.0.0",
  engines: PROVIDES,
  provides: PROVIDES,
  requires: [],
  events: {
    emits: ["PayrollCalculated@1", "PayrollFinalized@1", "TaxCalculated@1"],
    consumes: ["EmployeeUpserted@1", "ObligationStatusChanged@1"],
  },
  permissions: ["employees.read", "payroll.write"],
  features: ["ter-2024", "thr", "bpjs-2026", "jkp", "ump-2026", "overtime", "annual-reconciliation"],
  supportedLanguages: ["id", "en"],
  requiresCore: ">=2.2.0",
  commercialReady: false,
  signatureBlock: ID_SIGNATURE_BLOCK as SignatureBlock,
};


// ---- Providers ----

const tax: TaxProvider = {
  version: "1.0.0",
  calculate: (input) => {
    const r = calculateTax({ ...input, tables: TER_TABLES });
    return { category: r.category, rate: r.rate, tax: r.tax, surcharge: r.npwpSurcharge };
  },
};

const benefits: BenefitsProvider = {
  version: "1.0.0",
  calculate: ({ salary, metadata }) => {
    const jkkRiskLevel = (metadata?.jkkRiskLevel as BpjsRiskLevelCode) ?? "very-low";
    const r = calculateBpjs({ salary, jkkRiskLevel, includeJkp: true });
    return {
      employee: { ...r.employee } as Record<string, number> & { total: number },
      employer: { ...r.employer } as Record<string, number> & { total: number },
      sourceStatus: r.sourceStatus,
      jkp: r.jkp,
    };
  },
};

const thirteenth: ThirteenthProvider = {
  version: "1.0.0",
  calculate: (input) => calculateThr(input),
};

const payroll: PayrollProvider = {
  version: "1.0.0",
  buildPayslip: (input) => {
    const p = buildPayslip({ ...input, tables: TER_TABLES });
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
  version: "1.0.0",
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
            list.push({ period_start, period_end, due_date: computeDueDate(t, year, m).toISOString().slice(0, 10) });
          }
        } else if (t.frequency === "annual") {
          list.push({
            period_start: `${year}-01-01`,
            period_end: `${year}-12-31`,
            due_date: computeDueDate(t, year, 1).toISOString().slice(0, 10),
          });
        } else if (t.frequency === "quarterly") {
          for (const m of [3, 6, 9, 12]) {
            list.push({
              period_start: `${year}-${String(m - 2).padStart(2, "0")}-01`,
              period_end: `${year}-${String(m).padStart(2, "0")}-01`,
              due_date: computeDueDate(t, year, m).toISOString().slice(0, 10),
            });
          }
        }
        return list;
      },
    })),
};

const contracts: ContractProvider = {
  version: "1.0.0",
  validate: (c) =>
    evaluateContract(c as never).map((f) => ({
      code: f.rule_code,
      title: f.title,
      severity: f.severity as "critical" | "high" | "medium",
      passed: f.passed,
      message: f.message,
      weight: f.weight,
    })),
  coverage: (activeEmployees, activeContracts) => {
    if (activeEmployees === 0) return 100;
    return Math.round((Math.min(activeContracts, activeEmployees) / activeEmployees) * 100);
  },
};

const rules: RuleProvider = {
  version: "1.0.0",
  rules: () => legacyEnginesPack.complianceRules,
};

const audit: AuditProvider = {
  version: "1.0.0",
  heuristics: () => [],
};

const providers: Providers = { tax, benefits, payroll, thirteenth, calendar, contracts, rules, audit };

function health(): HealthReport {
  const checks = [
    { name: "params.loaded", ok: !!ID_PARAMS && Object.keys(ID_PARAMS).length > 0 },
    { name: "ruleset.version.present", ok: !!manifest.rulesetVersion },
    { name: "calendar.templates.non-empty", ok: (calendar.templates()?.length ?? 0) > 0 },
    { name: "rules.non-empty", ok: (rules.rules()?.length ?? 0) > 0 },
    { name: "signature.author.present", ok: !!manifest.signatureBlock?.author?.keyId },
  ] as { name: string; ok: boolean; message?: string }[];

  try {
    tax.calculate({ monthlyGross: 10_000_000, maritalStatus: "TK/0", hasNpwp: true });
    checks.push({ name: "tax.calculate.smoke", ok: true });
  } catch (err) {
    checks.push({ name: "tax.calculate.smoke", ok: false, message: (err as Error).message });
  }
  try {
    benefits.calculate({ salary: 10_000_000 });
    checks.push({ name: "benefits.calculate.smoke", ok: true });
  } catch (err) {
    checks.push({ name: "benefits.calculate.smoke", ok: false, message: (err as Error).message });
  }
  try {
    contracts.validate({ contract_type: "PKWTT", start_date: "2024-01-01", status: "active" } as never);
    checks.push({ name: "contracts.validate.smoke", ok: true });
  } catch (err) {
    checks.push({ name: "contracts.validate.smoke", ok: false, message: (err as Error).message });
  }
  try {
    thirteenth.calculate({ monthlySalary: 5_000_000, monthsOfService: 12 });
    checks.push({ name: "thirteenth.calculate.smoke", ok: true });
  } catch (err) {
    checks.push({ name: "thirteenth.calculate.smoke", ok: false, message: (err as Error).message });
  }

  const failing = checks.filter((c) => !c.ok);
  const status: HealthReport["status"] = failing.length === 0 ? "ok" : failing.length < 2 ? "warn" : "error";
  return { status, checks };
}

export const indonesiaPack: CountryPack = {
  manifest,
  params: {
    ...(ID_PARAMS as unknown as Record<string, unknown>),
    ...buildIndonesiaParamsMap(),
  },
  providers,
  supports: (c: Capability) => PROVIDES.includes(c),
  health,
};
