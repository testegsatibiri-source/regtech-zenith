export interface AuditContext {
  employees: Array<Record<string, unknown>>;
  params: Record<string, unknown>;
}
export interface AuditHeuristic {
  code: string;
  title: string;
  severity: "critical" | "high" | "medium" | "info";
  evaluate(ctx: AuditContext): { passed: boolean; message: string; impact?: number };
}
export interface AuditProvider {
  heuristics(): AuditHeuristic[];
}
