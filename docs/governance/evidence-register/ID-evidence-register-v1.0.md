# UBoard Evidence Register (v1.0) — Indonesia Country Pack v2.2.0 / ID-2026.4

Machine-readable twin: `src/lib/assurance/registers/id.ts`. A test enforces that every
evidence and gap identifier below exists in code and vice versa.

Jurisdiction scope: **Indonesia only**. Philippines evidence lives in
`docs/governance/evidence-register/PH-evidence-register-v1.0.md` and is never
consumed by Indonesian gates.

## Layer model

| Layer | Meaning |
|---|---|
| IMPLEMENTATION | Behaviour exists in code |
| TEST | Behaviour covered by automated/golden tests |
| REGULATORY | Independently validated against the primary regulation or by external counsel |
| PRODUCTION | Demonstrated in a real regulatory operation (portal acceptance, filed report) |

Non-inference rule: a higher layer is never inferred from a lower one.

## Status model

`VERIFIED` · `PARTIAL` · `PENDING` · `FAILED` · `NOT_APPLICABLE` · `NOT_EVALUATED`

## Evidence

| Evidence ID | Control | Domain | Layer | Status | Claim |
|---|---|---|---|---|---|
| EV-ID-TER-001 | PAY-PPH21 | payroll | TEST | PARTIAL | TER A/B/C (PP 58/2023) + UU HPP art. 17 annual reconciliation |
| EV-ID-BPJS-001 | PAY-BPJS | payroll | TEST | VERIFIED | BPJS Ketenagakerjaan 2026 rates per component |
| EV-ID-UMP-001 | LAB-MINWAGE | labor | TEST | PARTIAL | UMP 2026 floors for 38 provinces (rule ID-UMR-01) |
| EV-ID-SEPARATION-001 | LAB-SEPARATION | labor | TEST | VERIFIED | Pesangon / UPMK / UPH per PP 35/2021 |
| EV-ID-FILING-001 | REG-FILING | regulatory | IMPLEMENTATION | PENDING | Report generation per published layout; portal acceptance pending |
| EV-ID-SECURITY-001 | SEC-SIGN | security | TEST | VERIFIED | Ed25519 dual signature verified at install |
| EV-ID-PRIVACY-001 | PRV-UUPDP | privacy | IMPLEMENTATION | PARTIAL | UU PDP consent, retention and field encryption for pilot data |

## Gaps

| Gap ID | Title | State | Closure criterion |
|---|---|---|---|
| GAP-ID-LEGAL-001 | External Indonesian legal opinion | OPEN | Signed opinion covering PPh 21, BPJS, UMP, PP 35/2021 |
| GAP-ID-TER-OCR-001 | Visual re-check of TER B/C against the scanned DJP PDF (DEBT-026) | OPEN | Reviewer sign-off against rendered primary PDF |
| GAP-ID-UMP-OFFICIAL-001 | UMP 2026 from primary provincial decrees | OPEN | All 38 provinces tagged official |
| GAP-ID-BPJS-CEILING-001 | BPJS Kesehatan ceiling from primary decree | OPEN | Ceiling tagged official with decree reference |
| GAP-ID-FILING-001 | Real submission acceptance on DJP and BPJS portals | OPEN | Pilot submissions accepted, evidence archived |
| GAP-ID-PDP-DPO-001 | UU PDP DPO, 72h breach runbook, controller agreement | OPEN | DPO appointed, runbook approved, agreement signed |
| GAP-ID-OPS-SLA-001 | SLA in WIB timezone + liability cover | OPEN | Signed SLA and policy on file |

## Gates (evaluated by `evaluateId()`)

| Gate | Name | Requires | Blocking gaps |
|---|---|---|---|
| H20 | payrollCorrectness | TER, BPJS, UMP, SEPARATION @ REGULATORY | LEGAL (condition), TER-OCR (condition) |
| H21 | regulatoryOperations | FILING @ PRODUCTION | FILING (fail) |
| H22 | laborCoverage | UMP, SEPARATION @ TEST | UMP-OFFICIAL (fail), BPJS-CEILING (condition) |
| H23 | privacySecurity | SECURITY @ TEST, PRIVACY @ REGULATORY | PDP-DPO (fail) |
| H24 | enterpriseOperations | SECURITY @ TEST | OPS-SLA (condition) |

`commercialReady` for Indonesia is true only when H20–H24 all evaluate to PASS. It is
independent of the Philippines result.
