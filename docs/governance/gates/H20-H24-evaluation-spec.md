# Gates H20–H24 — Evaluation Spec v1.0.0

Engine: `src/lib/assurance/engine.ts` (pure, deterministic; `evaluatedAt` is an input).

| Gate | Name | Requires (min layer) | Blocking gaps |
|---|---|---|---|
| H20 | payrollCorrectness | SSS, BIR, WAGE-NCR, SEPARATION (REGULATORY) | LEGAL-001 (condition) |
| H21 | regulatoryOperations | FILING-001 (PRODUCTION) | FILING-001 (fail) |
| H22 | laborCoverage | WAGE-NCR (TEST) | WAGE-REGIONAL-001, OVERTIME-001 (fail) |
| H23 | privacySecurity | SECURITY (TEST), PRIVACY (REGULATORY) | DPA-DPO-001 (fail) |
| H24 | enterpriseOperations | SECURITY (TEST) | OPS-SLA-001 (condition) |

Rules:
- Missing, FAILED, expired or not-yet-effective evidence → FAIL.
- Status other than VERIFIED, or layer below the required one → CONDITIONAL.
- Open gap → FAIL or CONDITIONAL according to its effect.
- `commercialReady = H20 ∧ H21 ∧ H22 ∧ H23 ∧ H24`, all PASS. Anything else → VALIDATED / PILOT.
- A test fails the build if `manifest.commercialReady` differs from the engine result.
