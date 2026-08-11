# Philippines Country Pack — Audit Findings and Remediation Plan

Full read-only audit of the Philippines pack (engines, calendar, contracts, rules, audit, manifest) plus how it is wired to the authenticated workspace. Result: the pack itself is clean and correctly isolated, but **three workspace surfaces still bypass it and run Indonesian logic for PH companies**.

## Verdict

- Pack code: healthy, production tier, signed, no duplicated files, no orphan exports, no broken imports, `/packs/ph` resolves (no dead route).
- Backend/frontend link: partially broken. `createCompany` accepts PH, payroll resolves PH correctly, but Regulatory Calendar and part of AI Audit are hardcoded to Indonesia.

## Critical findings (PH company gets Indonesian behaviour)

1. **Regulatory Calendar is 100% Indonesian.** `src/lib/calendar.functions.ts` seeds obligations from `ID_OBLIGATIONS` and writes `country_code: "ID"` literally, for every company regardless of jurisdiction. The pack's own `phCalendarTemplates()` (BIR 1601-C, SSS R-5, PhilHealth RF-1, Pag-IBIG MCRF, BIR 2316, 1604-C) is implemented but **never called anywhere in the app** — a fully orphaned capability.
2. **AI Audit resolves the Indonesian pack explicitly.** `src/lib/audit.functions.ts` calls `CountryRuntime.get("ID")`, so PH audit heuristics/rules never load for a PH company.
3. **Database default hides the bug.** `compliance_obligations.country_code` defaults to `'ID'` at column level, so any row inserted without an explicit code is silently mislabelled Indonesian.

## Medium findings

4. **PH health check is weaker than Indonesia's.** `health()` smoke-tests only tax and benefits; contracts and 13th-month are never exercised, so a regression there would still report `ok` and keep the pack in production tier.
5. **Dead audit control.** `PH-LC-87-OT-PREMIUM` always returns `passed: true` ("requires timekeeping data"). It inflates the compliance score with a check that can never fail.
6. **Filipino locale is declared but empty.** The manifest advertises `["en","fil"]` and `/packs/ph` locks the page to `fil`, but no `fil` strings exist in `src/lib/i18n.tsx`, so every label silently falls back to English while the UI claims Filipino.
7. **`uboardhr.ph` is rendered as plain text**, not a link, on the pack card — inconsistent with it being presented as the local market site.
8. **Missing events.** PH emits no `PayrollFinalized@1` and consumes no `ObligationStatusChanged@1`, unlike Indonesia — so the calendar/event bus can never react to PH payroll closure.
9. **Sitemap omits `/packs/$country`** entirely, so `/packs/ph` is not discoverable by search engines.

## Low findings

10. Tax bracket table has 1-peso gaps between `upTo` and the next `floor` (e.g. 33,332 → 33,333); a gross of 33,332.50 falls through incorrectly.
11. SSS uses a simplified MSC clamp instead of the real stepped MSC table — documented, but a real payroll accuracy gap for commercial use.
12. `maritalStatus` / `hasNpwp` are passed into the PH tax engine and silently ignored (Indonesian concepts leaking through the shared SDK input type).

## Remediation plan

**Phase 1 — Close the Indonesia leaks (blocking for PH commercial use)**
- Rewrite `seedObligations` to resolve the calendar provider from the active company's pack via `CountryRuntime` and use `occurrences(year)` from the pack templates; write the company's real `country_code`.
- Replace `CountryRuntime.get("ID")` in `audit.functions.ts` with the company's country code.
- Migration to drop the `'ID'` default on `compliance_obligations.country_code` and make it explicit.

**Phase 2 — Pack quality**
- Extend PH `health()` with contracts and 13th-month smoke checks.
- Remove or downgrade the no-op overtime heuristic so it stops contributing a free pass to the score.
- Fix the tax bracket boundary gaps.
- Add `PayrollFinalized@1` emit and `ObligationStatusChanged@1` consume to the PH manifest.

**Phase 3 — Presentation consistency**
- Either ship a minimal `fil` string set or reduce the manifest to `["en"]` so declared languages match reality.
- Render the local market domain as a real link on the pack card.
- Add `/packs/$country` entries to the sitemap.

**Phase 4 — Regression tests**
- Test that seeding a calendar for a PH company produces BIR/SSS/PhilHealth codes with `country_code = "PH"` and zero Indonesian codes.
- Test that audit for a PH company loads PH rules only.
- Boundary tests for the corrected tax brackets.

## Technical notes

Files touched: `src/lib/calendar.functions.ts`, `src/lib/audit.functions.ts`, `src/packs/philippines/index.ts`, `src/packs/philippines/params.ts`, `src/packs/philippines/engines/tax.ts`, `src/components/packs/CountryPackCard.tsx`, `src/routes/sitemap[.]xml.ts`, one migration, plus new tests. No SDK or Core contract changes required — the calendar fix uses the existing `CalendarProvider` interface that both packs already implement.
