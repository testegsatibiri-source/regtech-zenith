// Contract Engine — PKWT/PKWTT rules per PP 35/2021 & UU 13/2003 (Omnibus Law).
import type { Finding } from "./compliance";

export type ContractType = "PKWT" | "PKWTT";
export type ContractStatus = "draft" | "active" | "expired" | "terminated";

export interface ContractLike {
  id?: string;
  employee_id?: string | null;
  contract_type: ContractType;
  status: ContractStatus;
  start_date: string;
  end_date?: string | null;
  probation_end_date?: string | null;
  base_salary: number;
}

const DAY = 86400000;
const PKWT_MAX_YEARS = 5; // PP 35/2021 art. 8
const PKWTT_PROBATION_MAX_DAYS = 90; // UU 13/2003 art. 60

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);
}
function daysFromToday(d: string) {
  const t = new Date();
  t.setUTCHours(0, 0, 0, 0);
  return Math.round((new Date(d).getTime() - t.getTime()) / DAY);
}

export type ContractRisk = "expired" | "critical" | "soon" | "ok" | "n/a";

export function classifyContractRisk(c: ContractLike): ContractRisk {
  if (c.status !== "active") return "n/a";
  if (c.contract_type === "PKWTT") return "ok";
  if (!c.end_date) return "n/a";
  const d = daysFromToday(c.end_date);
  if (d < 0) return "expired";
  if (d <= 30) return "critical";
  if (d <= 60) return "soon";
  return "ok";
}

/** Evaluate one contract → findings for the compliance score. */
export function evaluateContract(c: ContractLike, employeeName = "Employee"): Finding[] {
  const out: Finding[] = [];

  if (c.contract_type === "PKWT") {
    // Rule 1: must have end_date
    out.push({
      rule_code: "ID-PKWT-END",
      title: "PKWT contract has end date",
      severity: "critical",
      passed: !!c.end_date,
      weight: 30,
      message: c.end_date ? "End date set." : `${employeeName}: PKWT without end date — converts to PKWTT by law.`,
    });

    // Rule 2: max 5 years
    if (c.end_date) {
      const years = daysBetween(c.start_date, c.end_date) / 365.25;
      out.push({
        rule_code: "ID-PKWT-5Y",
        title: "PKWT ≤ 5 years (PP 35/2021)",
        severity: "high",
        passed: years <= PKWT_MAX_YEARS,
        weight: 18,
        message:
          years <= PKWT_MAX_YEARS
            ? `Duration ${years.toFixed(1)}y within limit.`
            : `${employeeName}: PKWT exceeds 5-year cap (${years.toFixed(1)}y) — auto-converts to PKWTT.`,
      });
    }

    // Rule 3: probation NOT allowed on PKWT
    out.push({
      rule_code: "ID-PKWT-PROB",
      title: "No probation on PKWT",
      severity: "high",
      passed: !c.probation_end_date,
      weight: 18,
      message: c.probation_end_date
        ? `${employeeName}: PKWT cannot include probation (UU 13/2003 art. 58) — clause void.`
        : "Compliant.",
    });

    // Rule 4: expiring soon
    const risk = classifyContractRisk(c);
    if (risk === "expired" || risk === "critical") {
      out.push({
        rule_code: "ID-PKWT-EXP",
        title: "PKWT not expired / not within 30 days",
        severity: risk === "expired" ? "critical" : "high",
        passed: false,
        weight: risk === "expired" ? 30 : 18,
        message:
          risk === "expired"
            ? `${employeeName}: PKWT expired on ${c.end_date} — renew or terminate.`
            : `${employeeName}: PKWT expires in ${daysFromToday(c.end_date!)} days — plan renewal (PP 35 art. 17).`,
      });
    }
  } else {
    // PKWTT probation cap
    if (c.probation_end_date) {
      const probDays = daysBetween(c.start_date, c.probation_end_date);
      out.push({
        rule_code: "ID-PKWTT-PROB90",
        title: "PKWTT probation ≤ 3 months",
        severity: "high",
        passed: probDays <= PKWTT_PROBATION_MAX_DAYS,
        weight: 18,
        message:
          probDays <= PKWTT_PROBATION_MAX_DAYS
            ? `Probation ${probDays} days within limit.`
            : `${employeeName}: probation ${probDays}d exceeds 90-day statutory maximum.`,
      });
    }
  }

  return out;
}

/** Aggregate findings for all contracts of a company + missing-contract check. */
export function evaluateContracts(
  contracts: ContractLike[],
  employees: { id: string; full_name: string }[],
): Finding[] {
  const findings: Finding[] = [];
  const activeByEmp = new Map<string, ContractLike>();
  for (const c of contracts) {
    if (c.status === "active" && c.employee_id) activeByEmp.set(c.employee_id, c);
  }
  const missing = employees.filter((e) => !activeByEmp.has(e.id));
  findings.push({
    rule_code: "ID-CONTRACT-COVERAGE",
    title: "All active employees have a signed contract",
    severity: "critical",
    passed: missing.length === 0,
    weight: 30,
    message: missing.length
      ? `${missing.length} employee(s) without active contract: ${missing.slice(0, 3).map((e) => e.full_name).join(", ")}${missing.length > 3 ? "…" : ""}`
      : "Every employee has a contract on file.",
  });

  for (const c of contracts) {
    if (c.status !== "active") continue;
    const emp = employees.find((e) => e.id === c.employee_id)?.full_name;
    findings.push(...evaluateContract(c, emp));
  }
  return findings;
}
