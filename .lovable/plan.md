# H20 — PH Payroll Correctness & Commercial-Readiness Gate

Your three points are right and I'm folding them in. Confirmed in code: `classify()` in `src/lib/packs/catalog.ts` checks only runtime status, version ≥ 1.0, `interfaceVersion` and signature; `classifyWithHealth()` adds structural `health()`. Nothing in that chain looks at fiscal correctness. So a pack whose SSS table is a clamp and whose 13th month uses the wrong legal base is labelled "Production" with zero blockers — exactly the gap you describe.

This plan replaces the previous audit ordering with a risk-ordered sprint, plus the classification fix.

## Scope of this sprint (H20)

Phase 1 only, plus the two guardrails that stop the same mistake repeating.

### 1. DEBT-022 + a fourth classification criterion (product gate, not a doc field)

All four of your guardrails are viable as written and none of them cost extra work at this size — they mostly constrain the rule rather than add surface.

- Register **DEBT-022** in `docs/tech-debt.md` (P0): "`production` tier measures structural health, not regulatory correctness."
- Add `commercialReady?: boolean` to the pack manifest. **Optional in the type, mandatory for Production in the rule**: `undefined` and `false` both resolve to not-ready. There is no "assume true" path.
- `classify()` gains a fourth cumulative step, evaluated *after* the structural ones, so it can only ever remove a tier, never rescue a pack that fails status/version/interface/signature. Blocker string: "commercial readiness not established". PH drops to Validation for the duration of the sprint; Indonesia declares `true` and stays Production.
- `commercialReady` is a **signed declaration**: it lives inside the canonical manifest bytes the signature covers, so flipping it invalidates the existing signature and forces a re-sign. A developer cannot move `false → true` and reach Production without the ruleset bump, the statutory tests and a new signature.
- ADR-0035 freezes the rule for all future packs and states explicitly that **passing tests are not statutory correctness** — the two signals stay separate by design.

This is deliberately the first item: cheaper now than after more packs ship.


### 2. Phase 1 — payroll correctness (the only financially blocking work)

- **SSS**: replace the MSC clamp with the real stepped MSC contribution table, including WISP above the regular ceiling and the actual EC brackets. Table goes in `params.ts` as versioned data, engine becomes a lookup.
- **13th month (PD 851)**: change the legal base to *total basic salary actually earned in the calendar year ÷ 12*. New input accepts earned-salary history; the current `monthlySalary × months` call stays as a documented convenience wrapper so nothing breaks.
- **Tax**: apply the ₱90,000 annual exemption for 13th month and other benefits; remove the now-dead `upTo` fields from the bracket rows.
- Bump `PH_PARAMS.version` and `rulesetVersion`, re-sign the pack, and only then flip `commercialReady` to `true` so the catalog promotes PH back to Production automatically.

### 3. Regulatory-accuracy signal in the UADA Score Engine

Add a **`regulatoryAccuracy`** dimension to `src/lib/uada/score/dimensions.ts` and its weight in the score contract. It scores each installed pack on declared-vs-modelled statutory tables (real table vs. simplified approximation) and on open P0 regulatory debts, so "31/31 green" can no longer mask a wrong SSS table. Existing dimension weights are rebalanced; contract examples updated per ADR-0031's freeze rules.

## Deferred, in your order

- **Phase 2 (calendar)** and **Phase 3 (contracts + regional wage orders)** run in parallel after H20 — compliance/deadline risk, no direct financial error.
- **Phase 5 split**: the locale fix (`/packs/ph` → English) ships inside H20 since it is cosmetic and independent. **Enabling the public PH calculator is blocked until Phase 1 closes** — exposing an interactive tool with wrong SSS and tax increases exposure.
- **Phase 4 (heuristic depth)** last; it is Indonesia-parity, not correctness.

## Technical notes

Files in scope: `src/packs/philippines/params.ts`, `engines/{benefits,thirteenth,tax}.ts`, `index.ts`, `signature.ts`; `src/sdk/manifest.ts` (optional `commercialReady`), `src/lib/packs/catalog.ts` (`classify`), `src/lib/uada/score/dimensions.ts` + `contracts/score/*`; `src/routes/packs.$country.tsx` (locale); `docs/tech-debt.md`, new `docs/adr/ADR-0035-commercial-readiness-criterion.md`.

New tests: stepped-MSC boundary cases against published SSS rows, PD 851 earned-base cases (mid-year raise, unpaid leave, partial year), ₱90k exemption boundary, a catalog invariant that a pack without `commercialReady` can never classify as Production, and a score-engine case where all tests pass but a simplified table still lowers `regulatoryAccuracy`.
