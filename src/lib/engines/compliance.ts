// H2/H6 — Compliance Engine driven by CountryPack rules.
// Legacy `CountryPack` shape is produced on demand by `legacy-bridge`, which
// reads from the SDK Runtime — no direct pack imports here.
import type { CountryPack, EmployeeLike, Severity } from "./types";
import { getLegacyPack } from "./legacy-bridge";

const getPack = (code: "ID" | "MY" | "SG" | "PH" | "VN" | "TH" = "ID") => getLegacyPack(code);

export type { EmployeeLike, Severity } from "./types";

export interface Finding {
  rule_code: string;
  title: string;
  severity: Severity;
  passed: boolean;
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

export function scoreFindings(findings: Finding[]): number {
  const total = findings.reduce((a, f) => a + f.weight, 0);
  if (total === 0) return 100;
  const passed = findings.reduce((a, f) => a + (f.passed ? f.weight : 0), 0);
  return Math.round((passed / total) * 100);
}

export function evaluateEmployee(emp: EmployeeLike, pack: CountryPack = getPack("ID")): Finding[] {
  return pack.complianceRules.map((r) => {
    const { passed, message } = r.evaluate(emp, { params: pack.params });
    return {
      rule_code: r.code,
      title: r.title,
      severity: r.severity,
      passed,
      message,
      weight: r.weight,
    };
  });
}

export function evaluateCompany(
  employees: EmployeeLike[],
  pack: CountryPack = getPack("ID"),
): ComplianceReport {
  const byEmployee = employees.map((e) => {
    const f = evaluateEmployee(e, pack);
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
    rulesetVersion: pack.rulesetVersion,
  };
}
