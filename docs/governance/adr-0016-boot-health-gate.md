# ADR-0016 — Boot Health Gate & Readiness Report

**Status:** Accepted (Sprint H11)
**Deciders:** Platform Architecture

## Context

H10 shipped substantial new infrastructure (registry, matrix, signatures,
config, alerts). H11 is the sprint where behaviour actually changes. Booting
the Runtime with any of these layers half-initialised risks serving traffic
against an inconsistent or unsigned pack set.

## Decision

Introduce a mandatory **Boot Health Gate** executed once at server startup:

```
Startup
  ↓ loadFeatureGates()
  ↓ loadRegistry() (if gate on)
  ↓ compatibilityMatrixCheck()
  ↓ signatureCheck() (if enforce gate on)
  ↓ healthCheck() (per pack)
  ↓ Runtime.markReady()
```

Any `error` step leaves the Runtime in `degraded` or `failed`. The result is
cached as a **Readiness Report** and exposed at:

- `GET /api/public/v1/readiness` — no PII, safe for external status pages.
- `/platform/readiness` — internal UI for operators/auditors.

Every boot writes a `runtime_boot_reports` row for history/audit.

## Consequences

- Support and on-call have a single URL to answer "is Runtime healthy?".
- Downstream teams (SDK, packs) get a deterministic startup contract.
- Boot cost is negligible (~ms per pack) and idempotent.
