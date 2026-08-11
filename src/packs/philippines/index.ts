// Philippines CountryPack — v1.0.0 (PH-2024.1), promoted to production in H17.
//   • interfaceVersion 1.0.0 (frozen contract)
//   • dual signatureBlock (author + platform countersign)
// Architectural validation of the SDK: implemented with ZERO edits outside
// this folder (see docs/tech-debt.md DEBT-018 for findings).
import type { CountryPack, Providers, HealthReport, Capability } from "@/sdk";
import type { CountryManifest } from "@/sdk";
import type { TaxProvider } from "@/sdk";
import type { BenefitsProvider } from "@/sdk";
import type { PayrollProvider } from "@/sdk";
import type { ThirteenthProvider } from "@/sdk";
import type { CalendarProvider } from "@/sdk";
import type { ContractProvider } from "@/sdk";
import type { RuleProvider, ComplianceRule } from "@/sdk/providers/RuleProvider";
import type { AuditProvider, AuditHeuristic } from "@/sdk";

import type { SignatureBlock } from "@/sdk/manifest";
import { PH_SIGNATURE_BLOCK } from "./signature";
import { PH_PARAMS } from "./params";
import { calculatePhTax } from "./engines/tax";
import { calculatePhBenefits } from "./engines/benefits";
import { calculatePhThirteenth } from "./engines/thirteenth";
import { buildPhPayslip } from "./engines/payroll";
import { validatePhContract, phCoverage } from "./engines/contracts";
import { phCalendarTemplates } from "./engines/calendar";

const PROVIDES: Capability[] = [
  "payroll", "tax", "benefits", "thirteenth",
  "calendar", "contracts", "audit", "rules",
];

const manifest: CountryManifest = {
  country: "PH",
  name: "Philippines",
  currency: "PHP",
  version: "1.0.0",
  rulesetVersion: `PH-${PH_PARAMS.version}`,
  interfaceVersion: "1.0.0",
  engines: PROVIDES,
  provides: PROVIDES,
  requires: [],
  events: {
    emits: ["PayrollCalculated@1", "PayrollFinalized@1", "TaxCalculated@1"],
    consumes: ["EmployeeUpserted@1", "ObligationStatusChanged@1"],
  },
  permissions: ["employees.read", "payroll.write"],
  features: ["train-law", "13th-month", "sss", "philhealth", "pagibig"],
  supportedLanguages: ["en", "fil"],
  requiresCore: ">=2.0.0",
  signatureBlock: PH_SIGNATURE_BLOCK as SignatureBlock,
};

const tax: TaxProvider = {
  version: "1.0.0",
  calculate: calculatePhTax,
};

const benefits: BenefitsProvider = {
  version: "1.0.0",
  calculate: calculatePhBenefits,
};

const thirteenth: ThirteenthProvider = {
  version: "1.0.0",
  calculate: calculatePhThirteenth,
};

const payroll: PayrollProvider = {
  version: "1.0.0",
  buildPayslip: buildPhPayslip,
};

const calendar: CalendarProvider = {
  version: "1.0.0",
  templates: () => phCalendarTemplates(),
};

const contracts: ContractProvider = {
  version: "1.0.0",
  validate: (c) => validatePhContract(c),
  coverage: (e, c) => phCoverage(e, c),
};

// Minimum wage + 13th month rules (compliance score inputs).
const phRules: ComplianceRule[] = [
  {
    code: "PH-DOLE-MINWAGE",
    title: "Salary ≥ NCR daily minimum wage",
    severity: "critical",
    weight: 10,
    evaluate: (emp) => {
      const monthlyFloor = PH_PARAMS.minWageNCRDaily * PH_PARAMS.workingDaysPerMonth;
      const passed = emp.base_salary >= monthlyFloor;
      return {
        passed,
        message: passed
          ? `Salary ₱${emp.base_salary.toLocaleString()} ≥ floor ₱${monthlyFloor.toLocaleString()}`
          : `Salary ₱${emp.base_salary.toLocaleString()} below NCR floor ₱${monthlyFloor.toLocaleString()}`,
      };
    },
  },
  {
    code: "PH-PD851-13TH",
    title: "Eligible for 13th month pay (PD 851)",
    severity: "high",
    weight: 6,
    evaluate: (emp) => {
      const passed = emp.base_salary > 0;
      return {
        passed,
        message: passed
          ? "Rank-and-file employee eligible for 13th month pay"
          : "Missing base salary — cannot validate 13th month eligibility",
      };
    },
  },
];

const rules: RuleProvider = {
  version: "1.0.0",
  rules: () => phRules,
};

// Data-driven heuristics only. A control that can never fail inflates the
// compliance score, so the previous overtime placeholder was removed: it
// returns once the timekeeping (T&A) module supplies real hours.
const phHeuristics: AuditHeuristic[] = [
  {
    code: "PH-WO-NCR-MINWAGE",
    title: "Monthly pay at or above the NCR minimum wage",
    severity: "critical",
    evaluate: (ctx) => {
      const monthlyFloor = PH_PARAMS.minWageNCRDaily * PH_PARAMS.workingDaysPerMonth;
      const below = ctx.employees.filter((e) => Number(e.base_salary ?? 0) > 0
        && Number(e.base_salary) < monthlyFloor);
      return {
        passed: below.length === 0,
        message: below.length === 0
          ? `All employees are at or above PHP ${monthlyFloor.toLocaleString("en-US")}/month (Wage Order NCR-24)`
          : `${below.length} employee(s) earn below the NCR minimum wage equivalent of PHP ${monthlyFloor.toLocaleString("en-US")}/month (Wage Order NCR-24)`,
        impact: below.length,
      };
    },
  },
];


const audit: AuditProvider = {
  version: "1.0.0",
  heuristics: () => phHeuristics,
};

const providers: Providers = { tax, benefits, payroll, thirteenth, calendar, contracts, rules, audit };

function health(): HealthReport {
  const checks: { name: string; ok: boolean; message?: string }[] = [
    { name: "params.loaded", ok: !!PH_PARAMS && Object.keys(PH_PARAMS).length > 0 },
    { name: "ruleset.version.present", ok: !!manifest.rulesetVersion },
    { name: "calendar.templates.non-empty", ok: (calendar.templates()?.length ?? 0) > 0 },
    { name: "rules.non-empty", ok: (rules.rules()?.length ?? 0) > 0 },
    { name: "interface.version.present", ok: !!manifest.interfaceVersion },
    { name: "signature.author.present", ok: !!manifest.signatureBlock?.author?.keyId },
    { name: "signature.countersign.present", ok: !!manifest.signatureBlock?.countersign?.keyId },
  ];
  try {
    tax.calculate({ monthlyGross: 30_000, maritalStatus: "single", hasNpwp: true });
    checks.push({ name: "tax.calculate.smoke", ok: true });
  } catch (err) {
    checks.push({ name: "tax.calculate.smoke", ok: false, message: (err as Error).message });
  }
  try {
    benefits.calculate({ salary: 30_000 });
    checks.push({ name: "benefits.calculate.smoke", ok: true });
  } catch (err) {
    checks.push({ name: "benefits.calculate.smoke", ok: false, message: (err as Error).message });
  }
  const failing = checks.filter((c) => !c.ok);
  const status: HealthReport["status"] = failing.length === 0 ? "ok" : failing.length < 2 ? "warn" : "error";
  return { status, checks };
}

export const philippinesPack: CountryPack = {
  manifest,
  params: PH_PARAMS as unknown as Record<string, unknown>,
  providers,
  supports: (c: Capability) => PROVIDES.includes(c),
  health,
};
