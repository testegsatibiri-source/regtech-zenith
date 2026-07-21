# ADR-0004 — Country Pack Conformance Testing

**Status:** Accepted (Sprint H6, 2026-07-20)

## Context

New country packs are the primary extension point of UBoard Asia. External
contributors (in-country CTOs, partners) will build them. Without a
mechanised conformance check, a pack that "compiles" can still ship with a
malformed manifest, missing provider versions, calendar templates that
throw at runtime, or tax cases that silently return the wrong bracket —
and the Core is left holding the bag.

## Decision

1. Ship a **Test Kit** as part of the SDK: `@/sdk/testkit`. It exports
   parametric suites:
   - `runManifestSuite(pack)` — validates via the Compatibility Validator.
   - `runTaxProviderSuite(pack, cases)` — parametric tax cases.
   - `runBenefitsProviderSuite(pack, cases)` — parametric benefits cases.
   - `runIsolationSuite(pack, dir)` — refuses cross-pack imports (see
     ADR-0003).

2. Every country pack MUST include a `__tests__/conformance.test.ts` file
   that imports and executes the relevant suites. Fixtures live in
   `src/sdk/testkit/fixtures/<CC>.ts`.

3. `bun test src/packs/` runs the full conformance surface for every pack.
   CI blocks merge if any pack's suite fails.

## Consequences

- Contribution friction drops: a new pack's author knows exactly what
  "done" means without reading the platform code.
- Reduces the risk that a legislative-update PR breaks a bracket by
  accident — fixtures encode reference values.
- Future work (DEBT-014): expand suites for Calendar / Contract /
  Payroll providers with country-specific fixtures.
