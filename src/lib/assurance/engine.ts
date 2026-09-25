// Evidence Evaluation Engine (ADR-0040). Pure and deterministic:
// same register + definitions + evaluatedAt ⇒ same output and same hash.
import {
  LAYER_RANK,
  type AssuranceEvaluation,
  type EvidenceRecord,
  type GapRecord,
  type GateDefinition,
  type GateResult,
  type GateStatus,
} from "./types";

export const GATES_VERSION = "1.0.0";

export const PILOT_STATEMENT =
  "VALIDATED / PILOT — not yet commercially qualified for unrestricted production deployment";
export const COMMERCIAL_STATEMENT = "COMMERCIAL — all assurance gates H20–H24 PASS";

const RANK: Record<GateStatus, number> = { PASS: 0, CONDITIONAL: 1, FAIL: 2 };
const worst = (a: GateStatus, b: GateStatus): GateStatus => (RANK[b] > RANK[a] ? b : a);

export function evaluateGate(
  def: GateDefinition,
  evidence: EvidenceRecord[],
  gaps: GapRecord[],
  evaluatedAt: string,
): GateResult {
  const day = evaluatedAt.slice(0, 10);
  let status: GateStatus = "PASS";
  const reasons: string[] = [];
  const openGaps: string[] = [];

  for (const req of def.requires) {
    const ev = evidence.find((e) => e.evidenceId === req.evidenceId);
    if (!ev) {
      status = worst(status, "FAIL");
      reasons.push(`${req.evidenceId}: missing`);
      continue;
    }
    if (ev.status === "FAILED") {
      status = worst(status, "FAIL");
      reasons.push(`${ev.evidenceId}: FAILED`);
      continue;
    }
    if (ev.expiresAt < day) {
      status = worst(status, "FAIL");
      reasons.push(`${ev.evidenceId}: expired ${ev.expiresAt}`);
      continue;
    }
    if (ev.effectiveFrom > day) {
      status = worst(status, "FAIL");
      reasons.push(`${ev.evidenceId}: not yet effective`);
      continue;
    }
    if (ev.status !== "VERIFIED") {
      status = worst(status, "CONDITIONAL");
      reasons.push(`${ev.evidenceId}: ${ev.status}`);
    }
    // Non-inference rule: only the explicitly demonstrated layer counts.
    if (LAYER_RANK[ev.layer] < LAYER_RANK[req.minLayer]) {
      status = worst(status, "CONDITIONAL");
      reasons.push(`${ev.evidenceId}: layer ${ev.layer} < required ${req.minLayer}`);
    }
  }

  for (const bg of def.blockingGaps) {
    const gap = gaps.find((g) => g.gapId === bg.gapId);
    const open = !gap || gap.state === "OPEN";
    if (!open) continue;
    openGaps.push(bg.gapId);
    status = worst(status, bg.effect === "fail" ? "FAIL" : "CONDITIONAL");
    reasons.push(`${bg.gapId}: OPEN (${bg.effect})`);
  }

  return {
    gate: def.gate,
    name: def.name,
    status,
    version: GATES_VERSION,
    evaluatedAt,
    evidenceRefs: def.requires.map((r) => r.evidenceId),
    blockingGaps: openGaps,
    reasons,
  };
}

export function evaluateAssurance(input: {
  country: string;
  registerVersion: string;
  evidence: EvidenceRecord[];
  gaps: GapRecord[];
  definitions: GateDefinition[];
  evaluatedAt: string;
}): AssuranceEvaluation {
  const gates = input.definitions.map((d) =>
    evaluateGate(d, input.evidence, input.gaps, input.evaluatedAt),
  );
  const commercialReady = gates.length > 0 && gates.every((g) => g.status === "PASS");
  return {
    country: input.country,
    registerVersion: input.registerVersion,
    gatesVersion: GATES_VERSION,
    evaluatedAt: input.evaluatedAt,
    gates,
    commercialReady,
    maturity: commercialReady ? "COMMERCIAL" : "VALIDATED_PILOT",
    statement: commercialReady ? COMMERCIAL_STATEMENT : PILOT_STATEMENT,
  };
}

/** Canonical JSON (sorted keys) for hashing. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function evaluationHash(ev: AssuranceEvaluation): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalJson(ev)));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
