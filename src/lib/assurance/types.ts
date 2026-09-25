// Assurance model — Evidence Register + Gates H20–H24 (ADR-0040).
// Pure types; no runtime dependencies so it is safe in browser, server and tests.

export type EvidenceLayer = "IMPLEMENTATION" | "TEST" | "REGULATORY" | "PRODUCTION";
export type EvidenceStatus =
  | "VERIFIED"
  | "PARTIAL"
  | "PENDING"
  | "FAILED"
  | "NOT_APPLICABLE"
  | "NOT_EVALUATED";

export const LAYER_RANK: Record<EvidenceLayer, number> = {
  IMPLEMENTATION: 0,
  TEST: 1,
  REGULATORY: 2,
  PRODUCTION: 3,
};

export interface EvidenceRecord {
  evidenceId: string;
  controlId: string;
  domain: string;
  claim: string;
  /** Highest layer EXPLICITLY demonstrated. Never inferred from lower layers. */
  layer: EvidenceLayer;
  status: EvidenceStatus;
  source: string;
  version: string;
  effectiveFrom: string; // YYYY-MM-DD
  expiresAt: string; // YYYY-MM-DD
  owner: string;
  relatedGaps: string[];
}

export type GapState = "OPEN" | "CLOSED";

export interface GapRecord {
  gapId: string;
  title: string;
  state: GapState;
  owner: string;
  closureCriterion: string;
}

export type GateId = "H20" | "H21" | "H22" | "H23" | "H24";
export type GateStatus = "PASS" | "CONDITIONAL" | "FAIL";

export interface GateDefinition {
  gate: GateId;
  name: string;
  requires: { evidenceId: string; minLayer: EvidenceLayer }[];
  /** effect "fail" = open gap forces FAIL; "condition" = open gap caps at CONDITIONAL. */
  blockingGaps: { gapId: string; effect: "fail" | "condition" }[];
}

export interface GateResult {
  gate: GateId;
  name: string;
  status: GateStatus;
  version: string;
  evaluatedAt: string;
  evidenceRefs: string[];
  blockingGaps: string[];
  reasons: string[];
}

export type Maturity = "COMMERCIAL" | "VALIDATED_PILOT";

export interface AssuranceEvaluation {
  country: string;
  registerVersion: string;
  gatesVersion: string;
  evaluatedAt: string;
  gates: GateResult[];
  commercialReady: boolean;
  maturity: Maturity;
  statement: string;
}
