# Philippines Pack — Full Functional Audit

Read-only audit of every capability the PH pack declares (payroll, tax, benefits, 13th month, calendar, contracts, rules, audit) plus how the workspace consumes it. All 31 pack tests pass and the previous Indonesia-leak remediation holds: calendar and AI audit now resolve the company's own jurisdiction.

## Verdict

The pack is structurally healthy and correctly isolated. What remains are **functional accuracy and coverage gaps** — the engines are simplified models, not yet payroll-grade for a paying Filipino customer.

## Findings by capability

### Tax (BIR / TRAIN) — works, incomplete
- Bracket lookup is floor-based and correct; boundary gaps are handled.
- `upTo` fields in the bracket table are now dead data — misleading for whoever maintains the params.
- Missing: the ₱90,000 annual exemption for 13th month and other benefits; no annualized/year-end withholding adjustment. Monthly-only withholding will drift from the employee's true annual liability.

### Benefits (SSS / PhilHealth / Pag-IBIG) — simplified
- SSS uses an MSC clamp instead of the real stepped MSC table, so contributions are wrong for most salaries between the floor and cap.
- No WISP (mandatory provident) split above the regular MSC ceiling.
- EC is a two-value approximation.
- PhilHealth and Pag-IBIG are correct for 2024 rules.

### 13th month (PD 851) — formula is not the legal one
- Computes `monthlySalary × months / 12`. The law is *total basic salary actually earned during the year / 12* — unpaid leave, mid-year raises and partial months all produce a wrong figure.
- `thirteenthDueMonth` / `thirteenthDueDay` are declared in params but never read anywhere: the December 24 deadline is not enforced or surfaced.

### Regulatory calendar — right forms, imprecise dates
- Six templates (1601-C, SSS R-5, RF-1, MCRF, 2316, 1604-C) — good coverage of the core filings.
- Every monthly `period_end` is hardcoded to day 28, so periods are wrong for 30/31-day months.
- SSS due day is a flat 30; the real deadline depends on the last digit of the employer ER number.
- No weekend/holiday roll-forward.
- **Missing obligations:** 13th month payment (Dec 24) and the DOLE 13th-month compliance report (Jan 15) — the pack's own headline feature has no calendar entry.

### Contracts — probationary only
- Only `probationary` is validated. Fixed-term, project, seasonal and casual contracts pass with zero findings.
- `monthsBetween` compares calendar months and ignores the day, so a 6-month-and-29-day probation reads as exactly 6 and escapes the Art. 296 cap.
- No end-of-contract or expiring-probation warning window.

### Rules & AI audit — NCR-only, thin
- Both the compliance rule and the audit heuristic hardcode the NCR daily minimum wage. Companies in any other region are measured against the wrong floor — false criticals outside Metro Manila.
- Two rules and one heuristic total, versus a much richer Indonesian set: the PH compliance score is coarse.
- No 13th-month, contract-coverage or benefits-remittance heuristics.

### Product surface
- `/packs/ph` is locked to Filipino via `LocaleScope`, but the manifest now correctly ships English only — the page requests a locale with no strings behind it.
- No public calculator for PH: `hasCalculator` allows Indonesia only, so the Philippines showcase page has no interactive proof of the engines.

## Remediation plan

**Phase 1 — Payroll correctness (blocking for commercial PH use)**
- Replace the SSS clamp with the real stepped MSC contribution table, including WISP.
- Rework 13th month to accumulate basic salary actually earned, keeping the current call signature as a convenience wrapper.
- Apply the ₱90,000 non-taxable benefits threshold in the tax engine and drop the dead `upTo` fields.

**Phase 2 — Calendar accuracy**
- Compute real month ends; add weekend/holiday roll-forward.
- Add the 13th month payment (Dec 24) and DOLE report (Jan 15) obligations using the existing params.
- Make the SSS deadline configurable by employer ER-number group, defaulting to the latest safe date.

**Phase 3 — Contracts and regional wages**
- Add validation for fixed-term, project and seasonal contracts plus an expiry warning window.
- Make `monthsBetween` day-accurate.
- Introduce a regional wage-order table and resolve the floor from the company/employee region, falling back to NCR.

**Phase 4 — Compliance depth**
- Add heuristics for 13th-month provisioning, contract coverage and benefits remittance so the PH score is comparable to Indonesia's.

**Phase 5 — Product surface**
- Switch `/packs/ph` to English until Filipino copy exists.
- Enable the calculator for PH and wire it to the PH payroll provider.

## Technical notes

Files in scope: `src/packs/philippines/params.ts`, `engines/{tax,benefits,thirteenth,calendar,contracts}.ts`, `index.ts`, plus `src/lib/packs/calculators.ts` and `src/routes/packs.$country.tsx` for the surface work. No SDK or Core contract changes required — every fix fits the existing provider interfaces. Each phase ships with tests under `src/packs/philippines/__tests__/`.
