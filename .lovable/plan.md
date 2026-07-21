## DEBT-019 — Remove the ID-hardcoded `legacy-bridge`

### Current state (verified)

- `src/lib/engines/legacy-bridge.ts` wires `taxEngine`/`socialEngine`/`thirteenthEngine` from `@/lib/engines/indonesia` regardless of the requested country code. Only `complianceRules` are country-correct (they flow through `RuleProvider`).
- The only real consumer of the bridge is `src/lib/engines/compliance.ts` (`evaluateEmployee` / `evaluateCompany`), and it uses **only** `pack.complianceRules` + `pack.params` + `pack.rulesetVersion`. It never touches `taxEngine`/`socialEngine`/`thirteenthEngine`.
- Callers of `evaluateCompany`/`evaluateEmployee` (`audit.functions.ts`, `dashboard.tsx`, `payroll.tsx`, `employees.tsx`) all default to Indonesia — so today the bug is latent, not visible, but it will corrupt PH/MY the moment anyone passes another code.
- `listLegacyPacks` and the full `CountryPack` legacy shape (`taxEngine`, `socialEngine`, `thirteenthEngine`) have zero remaining callers.

Conclusion: the bridge's engine wiring is dead code that also lies about correctness. The right fix is to delete the bridge and have compliance read directly from `CountryRuntime`.

### Goal

Kill DEBT-019 with zero behavior change for ID and correct multi-country behavior for PH/MY going forward. Keep Core edits minimal and additive.

### Plan

1. **Rewrite `src/lib/engines/compliance.ts` to consume `CountryRuntime` directly.**
   - Replace `getPack` with a small helper that returns `{ rules, params, rulesetVersion }` sourced from `CountryRuntime.get(code)` + its `RuleProvider` (`providers.rules?.rules() ?? []`).
   - Change `evaluateEmployee` / `evaluateCompany` signatures from `pack: CountryPack` to `code: CountryCode = "ID"` (keep the default so existing ID callers are untouched). Public return types (`Finding`, `ComplianceReport`) stay identical.
   - Ensure `import "@/sdk/bootstrap"` so packs are registered before first call (same pattern the bridge uses today).

2. **Delete `src/lib/engines/legacy-bridge.ts`** and remove its imports.

3. **Shrink `src/lib/engines/types.ts`** to the surface still in use:
   - Keep: `CountryCode`, `EmployeeLike`, `Severity`, `ComplianceRule`, `Ctx`, and any input/output types still referenced by `id-pack.ts` and callers.
   - Remove the dead legacy `CountryPack` interface fields `taxEngine`, `socialEngine`, `thirteenthEngine` (nothing imports them outside `id-pack.ts` and the bridge). `id-pack.ts` can keep exporting its concrete engines directly (used only by the PH-safe SDK path and by the bridge that we're removing).

4. **Verify no other imports break.** Grep for `legacy-bridge`, `getLegacyPack`, `listLegacyPacks`, `taxEngine`, `socialEngine`, `thirteenthEngine` after the edit — should be zero hits outside `id-pack.ts` internals.

5. **Tests.**
   - Existing `bun test src/packs/` (13 ID + 16 PH + 6 coexistence) must stay green.
   - Add a focused test: `evaluateCompany([...], "PH")` returns `rulesetVersion` matching the PH pack (proves the country parameter is honored, which the bridge silently broke).

6. **Docs.** In `docs/tech-debt.md`, move DEBT-019 to a "Closed" entry under the PH validation section and note the compliance-engine migration.

### Non-goals

- No API endpoint changes (DEBT-018 stays open).
- No changes to `id-pack.ts` engine internals.
- No UI/route changes; call sites keep their current default-ID behavior.

### Files touched

- Edit: `src/lib/engines/compliance.ts`, `src/lib/engines/types.ts`, `docs/tech-debt.md`
- Delete: `src/lib/engines/legacy-bridge.ts`
- Add: one test (location TBD — likely `src/packs/philippines/__tests__/compliance-runtime.test.ts`)

### Success metrics

- `rg "legacy-bridge|getLegacyPack|listLegacyPacks"` → 0 hits.
- `evaluateCompany(emps, "PH").rulesetVersion` equals PH pack's `rulesetVersion` (not ID's).
- All existing tests green; new test green.
