// H24 — Philippines pack constants. Lives INSIDE the pack on purpose: no
// SDK/Core module and no other pack may own these identifiers.

/** Stable identifiers of the pack's statutory tables (used by params + evidence tests). */
export const PH_TABLES = {
  SSS_MSC: "PH_SSS_MSC",
  PHILHEALTH: "PH_PHILHEALTH",
  BIR_MONTHLY: "PH_BIR_MONTHLY",
  WAGE_REGIONS: "PH_WAGE_REGIONS",
  PAGIBIG: "PH_PAGIBIG",
} as const;

export type PhTableId = (typeof PH_TABLES)[keyof typeof PH_TABLES];

/**
 * Provenance of a statutory table.
 * - "official": a matching evidence file exists in
 *   docs/governance/legal-opinions/ citing the published source (enforced by
 *   __tests__/params-validity.test.ts — never assign by inspection alone).
 * - "needs-review": currency not yet confirmed; a named ticket owns the review.
 * - "stale": a newer published issuance supersedes the values; correction
 *   requires a params/rulesetVersion bump + re-signature (separate sprint).
 */
export type PhSourceStatus = "official" | "needs-review" | "stale";

export interface PhStatutorySource {
  table: PhTableId;
  source: string;
  effectiveFrom: string; // ISO date the values took effect
  sourceStatus: PhSourceStatus;
  notes?: string;
}
