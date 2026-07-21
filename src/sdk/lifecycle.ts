// H10-MKT — Pack lifecycle state machine (8 states).
// Experimental → Draft → Review → Approved → Published → Deprecated → Yanked → Archived
export type PackState =
  | "experimental" | "draft" | "review" | "approved"
  | "published"   | "deprecated" | "yanked" | "archived";

const TRANSITIONS: Record<PackState, PackState[]> = {
  experimental: ["draft", "archived"],
  draft:        ["review", "experimental", "archived"],
  review:       ["approved", "draft", "archived"],
  approved:     ["published", "review", "archived"],
  published:    ["deprecated", "yanked"],
  deprecated:   ["archived", "yanked"],
  yanked:       ["archived"],
  archived:     [],
};

/** Guardrails per transition (evaluated by service layer). */
export interface TransitionGuard {
  from: PackState;
  to: PackState;
  requires: Array<"author-signature" | "countersignature" | "compatibility-ok" | "trust-policy-ok">;
}

export const GUARDS: TransitionGuard[] = [
  { from: "experimental", to: "draft",     requires: ["author-signature"] },
  { from: "draft",        to: "review",    requires: ["compatibility-ok"] },
  { from: "review",       to: "approved",  requires: ["countersignature", "compatibility-ok"] },
  { from: "approved",     to: "published", requires: ["trust-policy-ok"] },
];

export function canTransition(from: PackState, to: PackState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function guardsFor(from: PackState, to: PackState): TransitionGuard | undefined {
  return GUARDS.find((g) => g.from === from && g.to === to);
}
