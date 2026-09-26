# UBoard Evidence Register v1.0 — Philippines Country Pack v1.7.0 / PH-2025.1

Machine-readable twin: `src/lib/assurance/registers/ph.ts` (parity enforced by test).

Status: VERIFIED · PARTIAL · PENDING · FAILED · NOT_APPLICABLE · NOT_EVALUATED
Layers: IMPLEMENTATION → TEST → REGULATORY → PRODUCTION. A higher layer is never inferred from a lower one.

## Evidence

| ID | Control | Layer | Status | Source | Expires | Owner |
|---|---|---|---|---|---|---|
| EV-PH-SSS-001 | PAY-SSS | TEST | VERIFIED | params.ts + PH-sss-msc-2026-09-16.md | 2027-03-31 | country_cto:PH |
| EV-PH-BIR-001 | PAY-WHT | TEST | VERIFIED | engines/tax.ts + PH-bir-withholding-2026-09-16.md | 2027-03-31 | country_cto:PH |
| EV-PH-WAGE-NCR-001 | LAB-MINWAGE | TEST | VERIFIED | params.ts + wage-golden.test.ts | 2027-03-31 | country_cto:PH |
| EV-PH-SEPARATION-001 | LAB-SEPARATION | TEST | VERIFIED | engines/separation.ts + PhSeparationPanel | 2027-03-31 | country_cto:PH |
| EV-PH-FILING-001 | REG-FILING | TEST | PARTIAL | engines/filings + filings.tsx (portal acceptance pending) | 2027-03-31 | country_cto:PH |
| EV-PH-SECURITY-001 | SEC-SIGN | TEST | VERIFIED | signature.ts + sign-ph.ts + tamper test | 2027-09-23 | platform_admin |
| EV-PH-PRIVACY-001 | PRV-RA10173 | IMPLEMENTATION | PARTIAL | PH-data-protection-ra10173.md | 2027-03-31 | platform_admin |

## Gaps

| ID | Title | State | Closure criterion |
|---|---|---|---|
| GAP-PH-LEGAL-001 | External IBP legal opinion | OPEN | Signed opinion, 5 tables, dual sign-off |
| GAP-PH-FILING-001 | Real acceptance on 4 government portals | OPEN | 5 filings accepted in pilot |
| GAP-PH-WAGE-REGIONAL-001 | Wage Order resolution beyond NCR | OPEN | All RTWPB orders modeled + goldens |
| GAP-PH-OVERTIME-001 | Compositional OT / night diff / holiday engine | OPEN | DOLE premium engine + goldens |
| GAP-PH-DPA-DPO-001 | DPO, 72h runbook, field encryption | OPEN | PH-RA10173-1..4 closed |
| GAP-PH-OPS-SLA-001 | SLA in PHT + E&O insurance | OPEN | Signed SLA and policy |
