// H5/H6 — Official versioned event catalog. Every event ends in "@N".
export type SdkEvent =
  // Payroll lifecycle
  | { type: "PayrollCalculated@1"; companyId: string; runId: string; rulesetVersion: string; ts: string }
  | { type: "PayrollFinalized@1"; companyId: string; runId: string; rulesetVersion: string; ts: string }
  // Employees
  | { type: "EmployeeCreated@1"; companyId: string; employeeId: string; ts: string }
  | { type: "EmployeeUpserted@1"; companyId: string; employeeId: string; ts: string }
  // Contracts
  | { type: "ContractChanged@1"; companyId: string; contractId: string; ts: string }
  | { type: "ContractExpired@1"; companyId: string; contractId: string; ts: string }
  // Obligations / calendar
  | { type: "ObligationStatusChanged@1"; companyId: string; obligationId: string; status: string; ts: string }
  // Compliance / audit
  | { type: "RuleFailed@1"; companyId: string; ruleCode: string; severity: string; ts: string }
  | { type: "ComplianceUpdated@1"; companyId: string; score: number; ts: string }
  | { type: "AuditCompleted@1"; companyId: string; score: number; ts: string }
  | { type: "TaxCalculated@1"; companyId: string; amount: number; ts: string }
  // Pack lifecycle
  | { type: "CountryPackInstalled@1"; country: string; version: string; ts: string }
  | { type: "CountryPackValidated@1"; country: string; ok: boolean; errors: number; warnings: number; ts: string }
  | { type: "CountryPackFailed@1"; country: string; reason: string; ts: string }
  | { type: "CountryPackHealthChecked@1"; country: string; status: "ok" | "warn" | "error"; ts: string }
  // H11 boot / marketplace transition
  | { type: "RuntimeBootCompleted@1"; status: "ready" | "degraded" | "failed" | "booting"; matrixVersion: string; ts: string }
  | { type: "PackRegistryDivergence@1"; country: string; matrixVersion: string; engineVersion: string; reason: string; ts: string }
  | { type: "BootstrapRemoved@1"; ts: string };

export type SdkEventType = SdkEvent["type"];

export const SDK_EVENT_TYPES: readonly SdkEventType[] = [
  "PayrollCalculated@1",
  "PayrollFinalized@1",
  "EmployeeCreated@1",
  "EmployeeUpserted@1",
  "ContractChanged@1",
  "ContractExpired@1",
  "ObligationStatusChanged@1",
  "RuleFailed@1",
  "ComplianceUpdated@1",
  "AuditCompleted@1",
  "TaxCalculated@1",
  "CountryPackInstalled@1",
  "CountryPackValidated@1",
  "CountryPackFailed@1",
  "CountryPackHealthChecked@1",
  "RuntimeBootCompleted@1",
  "PackRegistryDivergence@1",
  "BootstrapRemoved@1",
] as const;
