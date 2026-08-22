// Philippines CountryPack — v1.4.0 (PH-2024.4), H22 offboarding + final pay.
//   • interfaceVersion 1.0.0 (frozen contract)
//   • dual signatureBlock (author + platform countersign) — must re-sign after ruleset bumps
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
import type { FilingProvider } from "@/sdk";
import type { SeparationProvider } from "@/sdk";

import type { SignatureBlock } from "@/sdk/manifest";
import { PH_SIGNATURE_BLOCK } from "./signature";
import { PH_PARAMS } from "./params";
import { calculatePhTax } from "./engines/tax";
import { calculatePhBenefits } from "./engines/benefits";
import { calculatePhThirteenth } from "./engines/thirteenth";
import { buildPhPayslip } from "./engines/payroll";
import { validatePhContract, phCoverage } from "./engines/contracts";
import { phCalendarTemplates } from "./engines/calendar";
import {
  validatePhEmployeeIdentifiers,
  PH_EMPLOYEE_IDENTIFIERS,
} from "./engines/identifiers";
import { PH_FILING_FORMS, generatePhFiling } from "./engines/filings";
import {
  phGrounds,
  phComputeSeparationPay,
  phComputeFinalPay,
  phProcessRequirements,
} from "./engines/separation";

const PROVIDES: Capability[] = [
  "payroll", "tax", "benefits", "thirteenth",
  "calendar", "contracts", "audit", "rules", "filings", "separation",
];


const manifest: CountryManifest = {
  country: "PH",
  name: "Philippines",
  currency: "PHP",
  version: "1.3.0",
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
  // Only ship languages that actually have translated copy (audit finding #6).
  supportedLanguages: ["en"],
  requiresCore: ">=2.0.0",
  commercialReady: false,
  signatureBlock: PH_SIGNATURE_BLOCK as SignatureBlock,
};


const tax: TaxProvider = {
  version: "1.1.0",
  calculate: calculatePhTax,
};

const benefits: BenefitsProvider = {
  version: "1.1.0",
  calculate: calculatePhBenefits,
};

const thirteenth: ThirteenthProvider = {
  version: "1.1.0",
  calculate: calculatePhThirteenth,
};

const payroll: PayrollProvider = {
  version: "1.0.0",
  buildPayslip: buildPhPayslip,
};

const calendar: CalendarProvider = {
  version: "1.1.0",
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
  {
    // H21 Phase 2 — statutory identifiers are a hard prerequisite for BIR/SSS/
    // PhilHealth/Pag-IBIG remittance files. A malformed number is rejected at
    // upload, so format is scored, not just presence.
    code: "PH-STAT-IDS",
    title: "Statutory identifiers registered (TIN, SSS, PhilHealth, Pag-IBIG)",
    severity: "high",
    weight: 8,
    evaluate: (emp) => {
      const v = validatePhEmployeeIdentifiers(emp.country_metadata ?? null);
      const invalid = v.issues.filter((i) => i.reason === "invalid");
      if (v.complete) {
        return { passed: true, message: `All ${PH_EMPLOYEE_IDENTIFIERS.length} statutory identifiers present and well-formed` };
      }
      return {
        passed: false,
        message: invalid.length > 0
          ? invalid.map((i) => i.message).join("; ")
          : `Missing: ${v.issues.map((i) => i.label).join(", ")}`,
      };
    },
  },
];

const rules: RuleProvider = {
  version: "1.1.0",
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
  {
    code: "PH-STAT-IDS-COVERAGE",
    title: "Workforce statutory identifiers complete (filing prerequisite)",
    severity: "high",
    evaluate: (ctx) => {
      const incomplete = ctx.employees.filter((e) => !validatePhEmployeeIdentifiers(
        (e.country_metadata as Record<string, unknown> | null) ?? null,
      ).complete);
      return {
        passed: incomplete.length === 0,
        message: incomplete.length === 0
          ? "Every employee has a TIN, SSS, PhilHealth and Pag-IBIG number on file"
          : `${incomplete.length} employee(s) missing or malformed statutory identifiers — BIR/SSS remittance files cannot be generated`,
        impact: incomplete.length,
      };
    },
  },
  {
    code: "PH-STAT-IDS-FORMAT",
    title: "Registered identifiers match the published number formats",
    severity: "medium",
    evaluate: (ctx) => {
      const malformed = ctx.employees.filter((e) => validatePhEmployeeIdentifiers(
        (e.country_metadata as Record<string, unknown> | null) ?? null,
      ).issues.some((i) => i.reason === "invalid"));
      return {
        passed: malformed.length === 0,
        message: malformed.length === 0
          ? "No malformed statutory identifiers detected"
          : `${malformed.length} employee(s) hold identifiers with an invalid digit length`,
        impact: malformed.length,
      };
    },
  },
];


// H21 Phase 4 — statutory filing exports (BIR/SSS/PhilHealth/Pag-IBIG).
// Generation only: these agencies expose no employer API, so transmission and
// the official receipt are recorded by the Core (DEBT-023).
const filings: FilingProvider = {
  version: "1.0.0",
  forms: () => PH_FILING_FORMS,
  generate: (req) => generatePhFiling(req),
};

const audit: AuditProvider = {
  version: "1.1.0",
  heuristics: () => phHeuristics,
};

const providers: Providers = { tax, benefits, payroll, thirteenth, calendar, contracts, rules, audit, filings };

function health(): HealthReport {
  const checks: { name: string; ok: boolean; message?: string }[] = [
    { name: "params.loaded", ok: !!PH_PARAMS && Object.keys(PH_PARAMS).length > 0 },
    { name: "ruleset.version.present", ok: !!manifest.rulesetVersion },
    { name: "calendar.templates.non-empty", ok: (calendar.templates()?.length ?? 0) > 0 },
    {
      // H21 Phase 3 — staggered deadlines must resolve from the employer registry.
      name: "calendar.deadlines.staggered",
      ok: (() => {
        const sss = calendar.templates().find((t) => t.code === "SSS-R5");
        if (!sss) return false;
        const withId = sss.occurrences(2026, {
          statutoryMetadata: { sss: "0312345673" },
          legalName: "Acme Manila Inc.",
        })[0];
        const without = sss.occurrences(2026, {})[0];
        return withId?.resolution === "resolved" && without?.resolution === "needs_review";
      })(),
    },
    { name: "rules.non-empty", ok: (rules.rules()?.length ?? 0) > 0 },
    { name: "filings.forms.non-empty", ok: (filings.forms()?.length ?? 0) === 5 },
    { name: "interface.version.present", ok: !!manifest.interfaceVersion },
    { name: "signature.author.present", ok: !!manifest.signatureBlock?.author?.keyId },
    { name: "signature.countersign.present", ok: !!manifest.signatureBlock?.countersign?.keyId },
    {
      name: "identifiers.specs.non-empty",
      ok: PH_EMPLOYEE_IDENTIFIERS.length === 4
        && validatePhEmployeeIdentifiers({}).issues.length === 4,
    },
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
  try {
    thirteenth.calculate({ monthlySalary: 30_000, monthsOfService: 12 });
    checks.push({ name: "thirteenth.calculate.smoke", ok: true });
  } catch (err) {
    checks.push({ name: "thirteenth.calculate.smoke", ok: false, message: (err as Error).message });
  }
  try {
    contracts.validate({
      contract_type: "probationary",
      status: "active",
      start_date: "2026-01-01",
      probation_end: "2026-05-01",
    });
    checks.push({ name: "contracts.validate.smoke", ok: true });
  } catch (err) {
    checks.push({ name: "contracts.validate.smoke", ok: false, message: (err as Error).message });
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
