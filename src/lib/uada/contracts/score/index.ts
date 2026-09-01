// H16.0 — Architecture Score contract FREEZE.
// This module is the single source of truth shared by the engine, the database
// (`uada_score_reports`), the console UI and the tests. Changing any shape here
// requires an ADR (see ADR-0031).

export type ScoreDimensionName =
  | "coupling"
  | "boundary_integrity"
  | "documentation_coverage"
  | "knowledge_freshness"
  | "test_coverage"
  | "regulatory_accuracy";

export const SCORE_DIMENSIONS: readonly ScoreDimensionName[] = [
  "coupling",
  "boundary_integrity",
  "documentation_coverage",
  "knowledge_freshness",
  "test_coverage",
  "regulatory_accuracy",
] as const;

/** Frozen weights. MUST sum to exactly 1. Enforced by tests. */
export const SCORE_WEIGHTS: Readonly<Record<ScoreDimensionName, number>> = {
  coupling: 0.2,
  boundary_integrity: 0.2,
  documentation_coverage: 0.15,
  knowledge_freshness: 0.15,
  test_coverage: 0.15,
  regulatory_accuracy: 0.15,
};

export interface ScoreDimension {
  name: ScoreDimensionName;
  /** 0..100, rounded to 2 decimals for determinism. */
  score: number;
  /** 0..1 weight taken from SCORE_WEIGHTS. */
  weight: number;
  /** Human-readable, deterministic facts that produced the score. */
  evidence: string[];
}

export interface ScoreReport {
  /** Stable snapshot label, e.g. "v42" or "2026-07-31-h15". */
  snapshot: string;
  /** Weighted mean of the dimensions, 0..100, 2 decimals. */
  overall: number;
  dimensions: ScoreDimension[];
  /** Overall of the previous stored snapshot, when one exists. */
  previousOverall?: number;
  /** overall - previousOverall, 2 decimals. Absent when there is no history. */
  delta?: number;
}

/** Deterministic rounding used everywhere a score is produced or compared. */
export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Weighted mean, using each dimension's own weight. */
export function computeOverall(dimensions: ScoreDimension[]): number {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  return roundScore(weighted / totalWeight);
}

/** Structural validation shared by engine, persistence layer and tests. */
export function assertScoreReport(report: ScoreReport): void {
  if (!report.snapshot) throw new Error("uada.score: missing snapshot label");
  if (report.overall < 0 || report.overall > 100) {
    throw new Error(`uada.score: overall out of range (${report.overall})`);
  }
  const seen = new Set<string>();
  for (const d of report.dimensions) {
    if (!SCORE_DIMENSIONS.includes(d.name)) {
      throw new Error(`uada.score: unknown dimension "${d.name}"`);
    }
    if (seen.has(d.name)) throw new Error(`uada.score: duplicate dimension "${d.name}"`);
    seen.add(d.name);
    if (d.score < 0 || d.score > 100) {
      throw new Error(`uada.score: ${d.name} score out of range (${d.score})`);
    }
    if (d.weight !== SCORE_WEIGHTS[d.name]) {
      throw new Error(`uada.score: ${d.name} weight drifted from the frozen contract`);
    }
  }
}
