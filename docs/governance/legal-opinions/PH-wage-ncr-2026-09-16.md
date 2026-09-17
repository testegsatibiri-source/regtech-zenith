# PH — NCR regional minimum wage — evidence file (H24 reconciliation)

| Field | Value |
| --- | --- |
| Table ID | PH_WAGE_REGIONS |
| effectiveFrom | 2023-07-16 |
| sourceStatus | stale |
| Author | UBoard Engineering (H24 reconciliation) |
| Reviewer | UBoard Compliance (H24 independent review) |
| Sprint | H24 — PH Statutory Evidence & Table Validity |

## Cited source

- DOLE / RTWPB-NCR Wage Order NCR-23 — ₱610/day non-agriculture, effective
  2023-07-16.
- Published: nwpc.dole.gov.ph wage orders portal.

## Values transcribed into the pack

`PH_PARAMS.wageRegions[0]` — `{ region: "NCR", dailyMinWage: 610, workingDaysPerMonth: 22 }`.
Monthly floor consumed by rules `PH-DOLE-MINWAGE` and `PH-WO-NCR-MINWAGE`:
₱610 × 22 = ₱13,420.

## Reconciliation result (2026-09-16)

**STALE — two findings.**

1. The value is two-to-three wage orders behind: NCR-24 (₱645/day, effective
   2024-07-17), NCR-26 (₱695/day, effective 2025-07-18) and NCR-27 (₱755/day
   non-agriculture, effective 2026-07-25; subject to litigation, and NCR-28
   published 2026-09-11 pending effectivity) have since superseded NCR-23.
2. The pre-H24 code comment cited "Wage Order NCR-24" for a value that is in
   fact the NCR-23 rate (₱610); NCR-24 set ₱645. The comment has been removed
   — structured metadata in `PH_PARAMS.statutorySources` is now the only
   source of truth.

Values are intentionally **unchanged** in H24 (zero-calculated-value-change
sprint). Correction requires a params/rulesetVersion bump, re-signature and
golden re-baseline — tracked as **DEBT-031**. The regional-array shape landed
here is the forward-compatible basis for B4 (multi-region support).

## Scope note

Internal evidence (B2a). Not a legal opinion. The external opinion (B2b)
remains open and blocks `commercialReady` together with B1 (ADR-0035).
