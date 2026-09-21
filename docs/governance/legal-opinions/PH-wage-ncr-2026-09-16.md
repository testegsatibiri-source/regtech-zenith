# PH — NCR regional minimum wage — evidence file (H24 reconciliation; DEBT-031 closure 2026-09-21)

| Field | Value |
| --- | --- |
| Table ID | PH_WAGE_REGIONS |
| effectiveFrom | 2026-09-26 |
| sourceStatus | official |
| Author | UBoard Engineering (H24 reconciliation; DEBT-031 closure) |
| Reviewer | UBoard Compliance (H24 independent review) |
| Sprint | H24 — PH Statutory Evidence & Table Validity; closure in the PH homologation sprint |

## Cited source

- DOLE / RTWPB-NCR **Wage Order NCR-28** — approved 2026-09-07, published
  2026-09-11 (Daily Tribune), effective **2026-09-26**: ₱755/day
  non-agriculture; ₱718/day agriculture, service/retail establishments
  employing ≤15 workers, and manufacturing regularly employing <10 workers.
  Single ₱60 increase over the NCR-26 baseline (₱695), no second tranche.
- Published: nwpc.dole.gov.ph NCR wage orders page (verified 2026-09-21).

### Why NCR-28 and not NCR-27

Wage Order NCR-27 (issued 2026-06-23, published 2026-07-09) scheduled the same
₱755 first tranche from 2026-07-25 plus a ₱25 second tranche to ₱780 on
2027-01-20 — but its implementation was restrained by the Pasig RTC Branch 152
(status quo ante order, TRO 2026-07-30, writ of preliminary injunction
2026-08-13) and is under Supreme Court review (En Banc, 2026-08-26). NCR-28's
preamble states NCR-27 "never took effect" and re-issues the ₱755 floor as a
fresh order "without prejudicing the pending legal proceedings". We therefore
transcribe ₱755 citing **NCR-28** (effective 2026-09-26) as the clean,
currently uncontested instrument. Until 2026-09-26 the operative floor remains
NCR-26 ₱695; the pack is in Validation (no production payroll), so the value
lands before any real use. Monitor: the NCR-27 litigation could still alter
the floor; any change requires a params/rulesetVersion bump + re-signature.

## Values transcribed into the pack

`PH_PARAMS.wageRegions[0]` — `{ region: "NCR", dailyMinWage: 755, workingDaysPerMonth: 22 }`.
Monthly floor consumed by rules `PH-DOLE-MINWAGE` and `PH-WO-NCR-MINWAGE`:
₱755 × 22 = ₱16,610.

## Reconciliation history

- **2026-09-16 (H24): STALE — two findings.** (1) The ₱610 value (NCR-23,
  2023-07-16) was superseded by NCR-24 (₱645), NCR-26 (₱695) and the NCR-27
  schedule. (2) A pre-H24 code comment cited "NCR-24" for the NCR-23 value;
  the comment was removed and structured metadata became the only source of
  truth. Correction deferred (DEBT-031).
- **2026-09-21: CLOSED.** Value corrected to ₱755 (NCR-28); pack bumped to
  v1.7.0 / PH-2025.1 and re-signed; `wage-golden.test.ts` re-baselined to the
  ₱16,610 monthly floor. The regional-array shape remains the
  forward-compatible basis for B4 (multi-region support).

## Scope note

Internal evidence (B2a). Not a legal opinion. The external opinion (B2b)
remains open and blocks `commercialReady` together with B1 (ADR-0035). The
NCR-27 litigation makes the external reviewer's temporal-validity statement
especially important for this table.
