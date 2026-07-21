# ADR-0007 — Regulatory Parameter Versioning

- **Status:** Accepted (Sprint H8-BO)
- **Date:** 2026-07-21
- **Deciders:** Platform, Country CTOs, Compliance

## Context

Legislative parameters (tax brackets, contribution ceilings, thresholds) are
today embedded inside each Country Pack (`pack.params`) and are the current
**Source of Truth** for the Runtime. Operations, however, need to:

- Track parameters as first-class governed artifacts (author, checksum,
  history) — not by reading source code.
- Preview upcoming changes before they ship in a pack.
- Diff versions, export snapshots, and reconcile across releases.

## Decision

Introduce a **register** table `regulatory_parameters` with a strict version
lifecycle (`draft → review → approved → active`) and immutable rows:

- `version` monotonically increases per `(country_code, parameter_key)`.
- `checksum` is a deterministic SHA-256 of the payload (see `hashing.ts`).
- Rows are **never edited**. New versions supersede.
- Every mutation is written to `platform_audit_log`.

**Explicit non-goal for H8-BO:** the register is **read-only / advisory**.
The Runtime remains the Source of Truth. `active` in the register is a
label, not a runtime effect.

The bridge (register → Runtime) will be delivered by the future
`ConfigurationService` (tracked as **DEBT-023**, P1).

## Consequences

- **+** Governance and audit history for parameters land now.
- **+** No behaviour change in the Runtime, so zero regression risk for
  installed packs.
- **−** Two apparent Sources of Truth — mitigated by the banner in
  `/platform/parameters` and this ADR.
