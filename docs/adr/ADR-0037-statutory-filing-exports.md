# ADR-0037 — Statutory filing exports as a pack capability (PH first)

**Status:** Accepted — Sprint H21, Phase 4
**Supersedes:** none · **Related:** ADR-0036, DEBT-022, DEBT-023

## Context

BIR, SSS, PhilHealth and Pag-IBIG publish no employer-facing REST API. Real
submission happens through web portals that accept fixed-layout files, or
through accredited third parties under a commercial contract. Any "integration"
we ship therefore has two separable halves: artifact generation (fully ours) and
transmission (out of band).

## Decision

1. New optional SDK capability `filings` with `FilingProvider`
   (`forms()` + `generate(request)`), additive to Pack Interface v1. Packs that
   do not implement it stay conformant.
2. The provider returns a `FilingArtifact`: file body, filename, row count,
   totals, warnings and the `rulesetVersion` that produced the numbers. It never
   performs I/O and never transmits.
3. The Core assembles payroll facts, hashes the artifact (SHA-256) and stores it
   in `statutory_filings` together with `pack_version` and `ruleset_version`.
4. Transmission is recorded as a receipt (`submitted_at`, agency reference,
   notes). A submitted filing is immutable — enforced by a database trigger.
5. Ruleset drift never rewrites history: filings whose `ruleset_version` differs
   from the installed pack are flagged `stale`, and the correction path is an
   **amended filing** that links back through `amends_filing_id` (DEBT-023).

## PH forms shipped

| Code | Agency | Layout | Legal basis |
|------|--------|--------|-------------|
| BIR-1601C | BIR | CSV | NIRC §79 / RR 11-2018 |
| BIR-1604C-ALPHALIST | BIR | DAT (Schedule 7.1) | RR 11-2018 / RMC 73-2019 |
| SSS-R3 | SSS | fixed-width TXT | RA 11199 §19-A |
| PHIC-RF1 | PhilHealth | CSV | RA 11223 / Circular 2020-0025 |
| HDMF-MCRF | Pag-IBIG | CSV | RA 9679 / Circular 274 |

## Consequences

- Missing or malformed statutory identifiers surface as artifact warnings before
  upload instead of as a portal rejection (Phase 2 dependency is hard).
- The per-scheme contribution split is recomputed from the pack when generating,
  because `payroll_items` stores only aggregates. A future payroll schema change
  should persist the split so filings can be reproduced without recomputation.
- `commercialReady` for PH stays `false` until the generated layouts are
  validated against an actual portal upload with a pilot employer.
- Pack re-signed at v1.3.0 (PH-2024.3); the capability list changed, so the
  previous signature keys were revoked.
