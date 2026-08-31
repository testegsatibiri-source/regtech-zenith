// H2/H6/PH — Compliance Engine driven directly by the SDK CountryRuntime.
// Reads RuleProvider + params + rulesetVersion per country code, so PH/MY
// return their own rules (not silently ID's, as the retired legacy-bridge did).
import "@/sdk/bootstrap";
import { CountryRuntime } from "@/sdk";
import type { ComplianceRule, CountryCode, EmployeeLike, Severity } from "./types";

export type { EmployeeLike, Severity } from "./types";

export interface Finding {
  rule_code: string;
  title: string;
  severity: Severity;
  passed: boolean;
  conclusive?: boolean;
  message: string;
  weight: number;
}

export interface ComplianceReport {
  score: number;
  totalWeight: number;
  passedWeight: number;
  findings: Finding[];
  byEmployee: { name: string; score: number; findings: Finding[] }[];
  rulesetVersion: string;
}

interface PackView {
  rules: ComplianceRule[];
  params: Record<string, unknown>;
  rulesetVersion: string;
}

function packView(code: CountryCode): PackView {
  const p = CountryRuntime.get(code);
  return {
    rules: p.providers.rules?.rules() ?? [],
    params: p.params,
    rulesetVersion: p.manifest.rulesetVersion,
  };
}

export function scoreFindings(findings: Finding[]): number {
  const total = findings.reduce((a, f) => a + f.weight, 0);
  if (total === 0) return 100;
  const passed = findings.reduce((a, f) => a + (f.passed ? f.weight : 0), 0);
  return Math.round((passed / total) * 100);
}

export function evaluateEmployee(emp: EmployeeLike, code: CountryCode = "ID"): Finding[] {
  const { rules, params } = packView(code);
  return rules.map((r) => {
    const { passed, message, conclusive } = r.evaluate(emp, { params });
    return {
      rule_code: r.code,
      title: r.title,
      severity: r.severity,
      passed,
      conclusive,
      message,
      weight: r.weight,
    };
  });
}

export function evaluateCompany(
  employees: EmployeeLike[],
  code: CountryCode = "ID",
): ComplianceReport {
  const { rulesetVersion } = packView(code);
  const byEmployee = employees.map((e) => {
    const f = evaluateEmployee(e, code);
    return { name: e.full_name, score: scoreFindings(f), findings: f };
  });
  const all = byEmployee.flatMap((e) => e.findings);
  const totalWeight = all.reduce((a, f) => a + f.weight, 0);
  const passedWeight = all.reduce((a, f) => a + (f.passed ? f.weight : 0), 0);
  return {
    score: scoreFindings(all),
    totalWeight,
    passedWeight,
    findings: all,
    byEmployee,
    rulesetVersion,
  };
}
