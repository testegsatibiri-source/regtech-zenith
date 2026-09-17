# PH — BIR monthly withholding + benefit exemption — evidence file (H24 reconciliation)

| Field | Value |
| --- | --- |
| Table ID | PH_BIR_MONTHLY |
| effectiveFrom | 2023-01-01 |
| sourceStatus | official |
| Author | UBoard Engineering (H24 reconciliation) |
| Reviewer | UBoard Compliance (H24 independent review) |
| Sprint | H24 — PH Statutory Evidence & Table Validity |

## Cited source

- Republic Act No. 10963 (TRAIN Law) — graduated income tax schedule, second
  phase from 2023-01-01.
- BIR Revenue Regulations No. 11-2018, Annex E — monthly withholding tax table
  on compensation.
- BIR Revenue Regulations No. 11-2018, Section 2.79.1(B)(a) — ₱90,000 annual
  exemption ceiling for 13th-month pay and other benefits.

## Values transcribed into the pack

`PH_PARAMS.birMonthly` — six brackets: ≤₱20,833 at 0%; ₱1,875 + 20% over
₱33,333 up to ₱66,666; ₱8,541.80 + 25% over ₱66,667 up to ₱166,666;
₱33,541.80 + 30% over ₱166,667 up to ₱666,666; ₱183,541.80 + 35% over
₱666,667 (15% bracket between ₱20,833 and ₱33,332).
`PH_PARAMS.birExemptBenefitsCeiling` — ₱90,000.

## Reconciliation result (2026-09-16)

**OFFICIAL.** The 2023–onward TRAIN schedule is the current schedule in 2026;
no BIR issuance has revised Annex E brackets or the ₱90,000 ceiling.

## Scope note

Internal evidence (B2a). Not a legal opinion. The external opinion (B2b)
remains open and blocks `commercialReady` together with B1 (ADR-0035).
