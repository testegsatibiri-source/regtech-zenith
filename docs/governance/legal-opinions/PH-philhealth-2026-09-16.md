# PH — PhilHealth premium table — evidence file (H24 reconciliation)

| Field | Value |
| --- | --- |
| Table ID | PH_PHILHEALTH |
| effectiveFrom | 2024-01-01 |
| sourceStatus | official |
| Author | UBoard Engineering (H24 reconciliation) |
| Reviewer | UBoard Compliance (H24 independent review) |
| Sprint | H24 — PH Statutory Evidence & Table Validity |

## Cited source

- Republic Act No. 11223 (Universal Health Care Act) — premium schedule, 5%
  final rate from 2024.
- PhilHealth Circular 2023-0027 — implementing premium schedule: 5% rate,
  income floor ₱10,000, income ceiling ₱100,000, shared equally between
  employer and employee, effective 2024-01-01.
- Published: philhealth.gov.ph circulars portal.

## Values transcribed into the pack

`PH_PARAMS.philhealth` — `rate: 0.05`, `floor: 10_000`, `cap: 100_000`.

## Reconciliation result (2026-09-16)

**OFFICIAL.** 5% is the last scheduled step of the UHC premium ramp and remains
the rate in force for 2026; floor and ceiling unchanged. No newer PhilHealth
circular supersedes Circular 2023-0027 for employed-sector premiums.

## Scope note

Internal evidence (B2a). Not a legal opinion. The external opinion (B2b)
remains open and blocks `commercialReady` together with B1 (ADR-0035).
