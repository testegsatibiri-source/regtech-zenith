# ADR-0017 — Compatibility Engine & Matrix Versioning

**Status:** Accepted (Sprint H11)

## Context

`CompatibilityService` grows with every regulatory or SDK change. Without
versioning, historical decisions (why a pack was accepted in Feb) become
un-auditable when the algorithm evolves.

## Decision

- `CompatibilityService` exposes `engineVersion` (constant per deploy).
- `CompatibilityMatrix` carries its own `version` (declarative, in code).
- Every `CompatibilityReport` records both fields.
- `compatibility_reports` DB table stores the tuple `(pack, engine, matrix,
  ok, checks)` for audit.

Engines and matrices evolve independently: `compatibilityEngineV2` may
coexist with `V1` and consume the same or a new matrix. Old rows remain
interpretable because the decision context is embedded.

## Consequences

- Auditors can reproduce a past pass/fail with the same engine + matrix.
- Migrations become explicit ("switch to engine v2 on 2027-01") instead of
  silent algorithmic drift.
