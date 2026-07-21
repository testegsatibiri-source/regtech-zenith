// Labor Code Art. 296 — probation ≤ 6 months, auto-regularization.
import type { ContractLike, ContractFinding } from "@/sdk";
import { PH_PARAMS } from "../params";

function monthsBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}

export function validatePhContract(c: ContractLike): ContractFinding[] {
  const findings: ContractFinding[] = [];

  if (c.contract_type === "probationary" && c.probation_end && c.start_date) {
    const months = monthsBetween(c.start_date, c.probation_end);
    const ok = months <= PH_PARAMS.probationMaxMonths;
    findings.push({
      code: "PH-LC-296-PROBATION-LIMIT",
      title: "Probation period within legal limit",
      severity: "high",
      passed: ok,
      message: ok
        ? `Probation ${months}mo ≤ ${PH_PARAMS.probationMaxMonths}mo`
        : `Probation ${months}mo exceeds Art. 296 cap of ${PH_PARAMS.probationMaxMonths}mo`,
      weight: 8,
    });
  }

  if (c.contract_type === "probationary" && c.start_date) {
    const today = new Date().toISOString().slice(0, 10);
    const months = monthsBetween(c.start_date, today);
    if (months > PH_PARAMS.probationMaxMonths && c.status === "active") {
      findings.push({
        code: "PH-LC-296-AUTO-REGULARIZATION",
        title: "Auto-regularization after 6 months",
        severity: "critical",
        passed: false,
        message: `Employee has ${months}mo tenure — Art. 296 mandates regular status`,
        weight: 10,
      });
    }
  }

  return findings;
}

export function phCoverage(activeEmployees: number, activeContracts: number): number {
  if (activeEmployees === 0) return 100;
  return Math.round((Math.min(activeContracts, activeEmployees) / activeEmployees) * 100);
}
