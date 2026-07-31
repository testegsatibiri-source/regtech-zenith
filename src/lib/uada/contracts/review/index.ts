// H15 — Review contracts. A ReviewReport is the artefact produced by the
// ReviewEngine when a diff is checked against the Knowledge Base + ADR rules.
// See ADR-0030 (Review Principle).
import type { Evidence } from "@/lib/uada/contracts/response";

export type ReviewSeverity = "info" | "warning" | "error";

/** Where the finding came from. Deterministic rules are reproducible; */
/** advisory findings are model-generated and always evidence-bound. */
export type ReviewOrigin = "rule" | "advisory";

export interface ReviewFinding {
  /** Stable rule id, e.g. "ARCH-001". Advisory findings use "ADV-<n>". */
  id: string;
  origin: ReviewOrigin;
  severity: ReviewSeverity;
  title: string;
  detail: string;
  /** Repository-relative file the finding applies to. */
  path: string;
  /** 1-based line in the new file when known. */
  line?: number;
  /** ADR / doc references backing the rule. */
  references: string[];
  suggestion?: string;
}

export interface ReviewVerdict {
  /** "block" when at least one error-severity finding exists. */
  decision: "approve" | "comment" | "block";
  errors: number;
  warnings: number;
  infos: number;
}

export interface ReviewReport {
  /** Files touched by the diff (new path when renamed). */
  filesChanged: string[];
  additions: number;
  deletions: number;
  findings: ReviewFinding[];
  verdict: ReviewVerdict;
  /** Rules that ran, for reproducibility. */
  rulesEvaluated: string[];
  evidence: Evidence[];
}

export function summariseVerdict(findings: ReviewFinding[]): ReviewVerdict {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const infos = findings.filter((f) => f.severity === "info").length;
  return {
    decision: errors > 0 ? "block" : warnings > 0 ? "comment" : "approve",
    errors,
    warnings,
    infos,
  };
}
