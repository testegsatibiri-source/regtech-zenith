import type { ComplianceRule, EmployeeLike } from "@/lib/engines/types";
import type { ProviderContext } from "../context";
export type { ComplianceRule, EmployeeLike };

export interface RuleProvider {
  readonly version: string;
  rules(ctx?: ProviderContext): ComplianceRule[];
}
