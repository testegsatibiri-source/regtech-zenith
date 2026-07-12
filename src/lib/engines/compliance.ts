// Compliance Engine — booleanish validators producing a Compliance Score.
import { ID_PARAMS } from "../countryPacks";

export interface EmployeeLike {
  full_name: string;
  base_salary: number;
  marital_status?: string;
  religion?: string | null;
  country_metadata?: Record<string, unknown> | null;
}

export type Severity = "critical" | "high" | "medium" | "info";

export interface Finding {
  rule_code: string;
  title: string;
  severity: Severity;
  passed: boolean;
  message: string;
  weight: number;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 30,
  high: 18,
  medium: 10,
  info: 4,
};

export interface ComplianceContext {
  province?: string;
}

export function evaluateEmployee(emp: EmployeeLike, ctx: ComplianceContext = {}): Finding[] {
  const findings: Finding[] = [];
  const meta = emp.country_metadata ?? {};
  const ump = ID_PARAMS.minimumWage[ctx.province ?? "DKI Jakarta"] ?? ID_PARAMS.minimumWage.Other;

  const w = (s: Severity) => SEVERITY_WEIGHT[s];

  // Minimum wage
  findings.push({
    rule_code: "ID-UMR-01",
    title: "Base salary ≥ Minimum Wage (UMP)",
    severity: "critical",
    passed: emp.base_salary >= ump,
    weight: w("critical"),
    message:
      emp.base_salary >= ump
        ? `Above regional minimum wage.`
        : `Base salary below UMP (${ump.toLocaleString("id-ID")}). Risk of Kemenaker sanction.`,
  });

  // NPWP (tax ID)
  const hasNpwp = Boolean(meta.npwp);
  findings.push({
    rule_code: "ID-TAX-02",
    title: "NPWP (tax ID) registered",
    severity: "high",
    passed: hasNpwp,
    weight: w("high"),
    message: hasNpwp ? "NPWP on file." : "Missing NPWP — 20% higher PPh 21 withholding applies (DJP).",
  });

  // NIK
  const hasNik = Boolean(meta.nik);
  findings.push({
    rule_code: "ID-ID-03",
    title: "NIK (national ID) recorded",
    severity: "medium",
    passed: hasNik,
    weight: w("medium"),
    message: hasNik ? "NIK on file." : "Missing NIK — required for BPJS & Dukcapil validation.",
  });

  // BPJS Kesehatan
  const hasHealth = Boolean(meta.bpjs_kesehatan);
  findings.push({
    rule_code: "ID-BPJS-04",
    title: "BPJS Kesehatan enrolled",
    severity: "high",
    passed: hasHealth,
    weight: w("high"),
    message: hasHealth ? "Health insurance registered." : "Not enrolled in BPJS Kesehatan (mandatory).",
  });

  // BPJS Ketenagakerjaan
  const hasEmp = Boolean(meta.bpjs_ketenagakerjaan);
  findings.push({
    rule_code: "ID-BPJS-05",
    title: "BPJS Ketenagakerjaan enrolled",
    severity: "high",
    passed: hasEmp,
    weight: w("high"),
    message: hasEmp ? "Employment insurance registered." : "Not enrolled in BPJS Ketenagakerjaan (mandatory).",
  });

  // Overtime (Omnibus Law)
  const weeklyOt = Number(meta.weekly_overtime_hours ?? 0);
  findings.push({
    rule_code: "ID-OT-06",
    title: "Overtime within Omnibus Law limits",
    severity: "medium",
    passed: weeklyOt <= ID_PARAMS.overtime.maxPerWeek,
    weight: w("medium"),
    message:
      weeklyOt <= ID_PARAMS.overtime.maxPerWeek
        ? "Overtime within legal limit."
        : `Weekly overtime ${weeklyOt}h exceeds ${ID_PARAMS.overtime.maxPerWeek}h limit — labour dispute risk.`,
  });

  return findings;
}

export interface ComplianceReport {
  score: number;
  totalWeight: number;
  passedWeight: number;
  findings: Finding[];
  byEmployee: { name: string; score: number; findings: Finding[] }[];
}

export function scoreFindings(findings: Finding[]): number {
  const total = findings.reduce((a, f) => a + f.weight, 0);
  if (total === 0) return 100;
  const passed = findings.reduce((a, f) => a + (f.passed ? f.weight : 0), 0);
  return Math.round((passed / total) * 100);
}

export function evaluateCompany(employees: EmployeeLike[], ctx: ComplianceContext = {}): ComplianceReport {
  const byEmployee = employees.map((e) => {
    const f = evaluateEmployee(e, ctx);
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
  };
}
