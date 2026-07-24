// H12.5 — Rule Engine definition shape (YAML-compatible). H17 executes.

export type RuleSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface RuleMatch {
  kind: "migration" | "code" | "route" | "adr" | "doc";
  pathPattern?: string;
  contains?: string | string[];
}

export interface RuleDefinition {
  code: string;
  severity: RuleSeverity;
  description: string;
  match: RuleMatch;
  require?: string[];
  forbid?: string[];
  remediation?: string;
}
