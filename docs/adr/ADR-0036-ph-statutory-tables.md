# ADR-0036 — Philippines Statutory Tables as Versioned Pack Parameters

## Status

Proposed (Sprint H21 — PH Statutory Accuracy).

## Context

The Philippines Country Pack (v1.0.0) was promoted to production-tier structurally but intentionally kept `commercialReady: false` because three fiscal engines use simplified models that diverge from real Philippine statutes (DEBT-022):

1. SSS contributions apply a clamped MSC (Monthly Salary Credit) range instead of the RA 11199 stepped table.
2. 13th month pay (PD 851) is computed on the current monthly salary, not on the total earned in the calendar year divided by 12.
3. The BIR TRAIN withholding engine does not apply the ₱90,000 annual tax-exempt cap for 13th month and other benefits (RR 11-2018 / TRAIN Law).

These are not bugs in the code structure; they are data-fidelity gaps. The Core and SDK contracts already support parameterised rules, so the fix is to load real statutory tables into the pack and bump `manifest.rulesetVersion` whenever they change.

## Decision

We will keep all statutory tables (SSS MSC, PhilHealth caps, BIR tax brackets, 13th month rules, regional minimum wages) as versioned parameters inside the Philippines pack, under the same `rulesetVersion` semantics defined in ADR-0035. The canonical signing bytes include `rulesetVersion` (already true), so any table change must be re-signed.

### SSS MSC

Replace the clamped MSC (4,000–30,000) with the RA 11199 stepped table. The engine will look up the employee salary in the table and return the exact MSC, employee share, employer share, and EC. The table is stored as an array of records in `PH_PARAMS.sss.table` keyed by `year`.

### 13th month pay (PD 851)

The legally correct base is:

```text
thirteenth = (total_basic_earned_in_calendar_year + total_overtime_premium + total_night_differential_premium) / 12
```

For the current pack, the engine will expose an optional `annualGrossEarned` input; if omitted, it falls back to the current `monthlySalary` behaviour and emits a warning flag. When the payroll/filings module has accumulated real annual earnings, the caller must pass `annualGrossEarned` to reach the statutory base.

### BIR ₱90,000 exemption

The withholding engine will accept a `benefits` object (13th month, de minimis, other benefits) and apply the exemption ceiling before computing taxable compensation. Until the benefits catalog is explicit, the engine treats the whole `monthlyGross` as taxable and documents that non-wage benefits must be passed separately for accurate withholding.

### Regional minimum wage

NCR is the only region today. We will add a `regions` table keyed by region code, with NCR as the default, and a placeholder `others` average so the rule engine can report region-aware warnings. The Wage Order region code is stored on the employee/branch `country_metadata` and used by the `PH-DOLE-MINWAGE` rule.

## Consequences

- `PH_PARAMS.rulesetVersion` will bump from `PH-2024.1` to `PH-2024.2` when the SSS stepped table lands.
- The `manifest.rulesetVersion` change triggers a new signature and a new pack registry entry.
- Any filing generated before the ruleset bump is marked `stale` if a new filing is generated after the bump (DEBT-023).
- Test fixtures must cite the published source (SSS Circular, BIR RR, DOLE Wage Order) for every bracket and boundary value.

## Evidence required at release

For the Philippines pack to declare `commercialReady: true`, the release approver must attach:

1. SSS Circular 2024 or equivalent showing the stepped MSC table and rates used.
2. BIR RR 11-2018 / TRAIN Law text showing the withholding brackets and the ₱90,000 exemption.
3. DOLE Wage Order NCR-24 (or successor) for the NCR minimum wage.
4. PD 851 text for the 13th month base calculation.

Without this evidence, the pack stays `commercialReady: false` and the `Production` tier is blocked by `classify()` (ADR-0035).

## Related

- ADR-0035 — Commercial Readiness Criterion.
- DEBT-022 — PH Payroll Correctness gap.
- DEBT-023 — Filing immutability vs. retroactive ruleset change.
- `src/packs/philippines/params.ts`
- `src/packs/philippines/engines/{benefits.ts,thirteenth.ts,tax.ts}`
