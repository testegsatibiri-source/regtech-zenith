// H12.5 — UADA response envelope. Every engine returns this shape so callers
// can trust confidence, snapshot lineage, and evidence for anti-hallucination.

export interface Evidence {
  source: "code" | "db" | "adr" | "docs" | "route" | "migration" | "infra";
  path: string;
  snippet?: string;
  /** 0..1 retrieval score (semantic similarity, graph distance, etc.). */
  score: number;
}

export interface Warning {
  code: string;
  message: string;
}

export interface UadaResponse<T> {
  data: T;
  /** 0..1 — 1 = fully backed by evidence, 0 = fabricated. */
  confidence: number;
  snapshotVersion: number;
  filesUsed: string[];
  model: string;
  evidence: Evidence[];
  warnings?: Warning[];
}

/** Sentinel returned when the anti-hallucination guard trips. */
export interface InsufficientEvidence {
  reason: "insufficient_evidence";
  missing: string[];
}
