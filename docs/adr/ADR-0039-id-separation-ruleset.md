# ADR-0039 — Indonesia separation ruleset (PP 35/2021) as evidence-first engine

- **Status:** Accepted (Sprint H23 — Fase C)
- **Date:** 2026-07-21
- **Deciders:** Platform, Compliance, Legal

## Context

Indonesia regulates termination payments through PP 35/2021 (implementing UU 6/2023
"Cipta Kerja" arts. 156–157), with a Constitutional Court transition
(MK 168/PUU-XXI/2023) bounding the legislative window until 2026-10-31.
The entitlement is never a single multiplier: each reason (arts. 36–56) composes
**pesangon**, **UPMK** (uang penghargaan masa kerja), **UPH** (uang penggantian hak)
and, for resignation-type reasons, **uang pisah** (contractual, not statutory).

The Philippines pack (ADR-0036) showed that shipping a simplified "final pay" model
for a jurisdiction whose law is compositional creates silent underpayment risk.

## Decision

1. **Evidence object, not a number.** `computeIdSeparation` returns statutory minimum,
   component list (statutory vs contractual), legal-basis snapshot, inputs snapshot,
   calculation trace, completeness, warnings and compliance violations — persisted
   per case in `separation_cases` with a `calculation_hash` (SHA-256 over inputs +
   rule version + entitlement config + components).
2. **Immutability after approval.** A DB trigger freezes the calculation columns
   once `approved_at` is set; corrections happen by issuing a new calculation.
   Segregation of duties: the approver cannot be the calculator
   (`separation.calculate` vs `separation.approve` capabilities).
3. **Normative window enforced.** Separations dated before the ruleset's
   `effectiveFrom` (2024-10-31) are blocked (`BLOCKED_MISSING_HISTORICAL_RULESET`);
   on/after `blockingFrom` (2026-10-31, inclusive) they are blocked pending
   regulatory revalidation (`BLOCKED_PENDING_REGULATORY_REVALIDATION`).
4. **No automatic PKWT→PKWTT conversion.** Duration beyond 60 months or missing
   end date raises `ID-PKWT-DURATION` / `requiresLegalClassification` and blocks
   renewal; the platform never reclassifies a contract on the employee's behalf.
5. **Uang pisah is contractual.** It is only computed when the employer supplies an
   amount sourced from the employment agreement / company regulation / CBA; the
   engine never invents it, and warns when a resignation-type reason omits it.
6. **THR is a sibling component**, pro-rated by months of service
   (Permenaker 6/2016), unless already paid in the calendar year.
7. **commercialReady unchanged.** This ADR does not flip the flag (ADR-0038); the
   pack ships a machine-readable `commercialReadiness` blocker list instead.

## Consequences

- The generic `/separations` screen keeps the Philippines final-pay flow; Indonesian
  companies get the PP 35/2021 panel on the same route.
- Four open questions for Indonesian counsel are frozen in
  `docs/governance/legal-opinions/README.md` and block the commercial gate.
- `PACK_VERSION`/`rulesetVersion` bumps wait for D7 (release), per the release
  process — this sprint ships the capability without a version bump.
