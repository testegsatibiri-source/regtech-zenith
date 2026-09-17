# PH — Pag-IBIG / HDMF contribution — evidence file (H24 reconciliation)

| Field | Value |
| --- | --- |
| Table ID | PH_PAGIBIG |
| effectiveFrom | 2024-02-01 |
| sourceStatus | official |
| Author | UBoard Engineering (H24 reconciliation) |
| Reviewer | UBoard Compliance (H24 independent review) |
| Sprint | H24 — PH Statutory Evidence & Table Validity |

## Cited source

- Republic Act No. 9679 (HDMF Law of 2009).
- HDMF Circular No. 460 — Maximum Fund Salary (MFS) raised to ₱10,000, 2%
  employee / 2% employer on the MFS (₱200 cap per side), effective 2024-02-01.
- Published: pagibigfund.gov.ph circulars portal.

## Values transcribed into the pack

`PH_PARAMS.pagibig` — `rate: 0.02`, `cap: 200` (₱10,000 MFS × 2%).

## Reconciliation result (2026-09-16)

**OFFICIAL.** The ₱10,000 MFS and ₱200 cap remain in force in 2026; no newer
HDMF circular supersedes Circular 460. Known simplification (documented, not a
finding): HDMF rules apply a 1% employee tier at or below ₱1,500 monthly
compensation; the pack models the flat 2% tier used in formal payroll.

## Scope note

Internal evidence (B2a). Not a legal opinion. The external opinion (B2b)
remains open and blocks `commercialReady` together with B1 (ADR-0035).
