// H13.5 — Deterministic hash for Evidence items. Prevents post-hoc tampering
// and detects cache/serialization corruption. Uses Web Crypto (Worker-safe).
import type { Evidence } from "./index";

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

/** Canonical composition: path|score|snapshotVersion|snippet (snippet defaults to ''). */
export function evidencePreimage(
  e: Pick<Evidence, "path" | "score" | "snapshotVersion" | "snippet">,
): string {
  return `${e.path}|${e.score}|${e.snapshotVersion}|${e.snippet ?? ""}`;
}

export async function computeEvidenceHash(
  e: Pick<Evidence, "path" | "score" | "snapshotVersion" | "snippet">,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(evidencePreimage(e)));
  return toHex(digest);
}

export interface EvidenceGuardOptions {
  /** Minimum number of evidence items required for confidence > 0. Default: 1. */
  minEvidence?: number;
}

/**
 * Anti-hallucination guard.
 * - Rejects incomplete evidence (missing required fields).
 * - Recomputes `evidenceHash` and rejects on mismatch.
 * - Forces `confidence = 0` when evidence is empty.
 * - Rejects `confidence ∉ [0, 1]`.
 *
 * Throws with a stable message prefix so callers can classify.
 */
export async function assertEvidenceComplete<T>(
  resp: {
    confidence: number;
    evidence: Evidence[];
    data?: T;
  },
  opts: EvidenceGuardOptions = {},
): Promise<void> {
  const min = opts.minEvidence ?? 1;

  if (typeof resp.confidence !== "number" || Number.isNaN(resp.confidence)) {
    throw new Error("uada.evidence: confidence must be a number");
  }
  if (resp.confidence < 0 || resp.confidence > 1) {
    throw new Error(`uada.evidence: confidence out of range (${resp.confidence})`);
  }

  if (!Array.isArray(resp.evidence)) {
    throw new Error("uada.evidence: evidence must be an array");
  }

  if (resp.evidence.length < min && resp.confidence > 0) {
    throw new Error(
      `uada.evidence: confidence=${resp.confidence} requires at least ${min} evidence item(s); got ${resp.evidence.length}`,
    );
  }

  for (const [i, e] of resp.evidence.entries()) {
    if (!e.source) throw new Error(`uada.evidence[${i}]: missing source`);
    if (!e.path) throw new Error(`uada.evidence[${i}]: missing path`);
    if (typeof e.score !== "number") throw new Error(`uada.evidence[${i}]: missing score`);
    if (typeof e.snapshotVersion !== "number") {
      throw new Error(`uada.evidence[${i}]: missing snapshotVersion`);
    }
    if (!e.evidenceHash) throw new Error(`uada.evidence[${i}]: missing evidenceHash`);
    const expected = await computeEvidenceHash(e);
    if (expected !== e.evidenceHash) {
      throw new Error(
        `uada.evidence[${i}]: hash mismatch (path=${e.path}) — expected ${expected}, got ${e.evidenceHash}`,
      );
    }
  }
}
