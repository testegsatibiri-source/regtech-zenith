import type { ComplianceRule, EmployeeLike } from "@/lib/engines/types";
export type { ComplianceRule, EmployeeLike };

export interface RuleProvider {
  rules(): ComplianceRule[];
}
