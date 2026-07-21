# Contribution Guide

## New Country Pack

1. Create `src/packs/<iso2>/index.ts` exporting a `CountryPack`.
2. Fill the manifest (see `country-pack-spec.md`). Start with `version: 0.1.0`
   and only the capabilities you actually implement.
3. Implement the providers listed in `manifest.engines`. Reuse pure helpers
   from your own pack folder; never import another pack.
4. Register in `src/sdk/bootstrap.ts` via `CountryRuntime.tryInstall(myPack)`
   — this single line is the only permitted Core edit for a pack-only PR.
5. Add a smoke check to `/country-packs` — it should render with the correct
   version and capability badges.
6. Add rules/obligations progressively; each PR bumps `rulesetVersion`, not
   `version` (unless the provider surface changed).

## PR flow (H7-Gov)

```text
Branch  →  Develop  →  Test Kit  →  Open PR  →  ADR gate  →  Code review
   →  CODEOWNERS approval  →  Merge  →  Release (gated)
```

Every step is mandatory. The **ADR gate** and the **release gate** are the
two non-obvious ones — do not skip them.

### ADR gate (before code review)

Ask: *does this PR touch any of the following?*
- SDK contracts (`src/sdk/providers/**`, `src/sdk/CountryPack.ts`, `src/sdk/manifest.ts`)
- Runtime (`src/sdk/runtime.ts`, `src/sdk/context.ts`, `src/sdk/validator.ts`)
- Event catalog (`src/sdk/events.ts`, `src/lib/events/bus.ts`)
- Capability model (`src/sdk/Capability.ts`, `src/sdk/interfaces.ts`)

- **Yes** → Architecture Review required. File
  `docs/governance/ADR-XXXX-<slug>.md`, label the PR `architecture-change`,
  request `@cto-global` **and** `@ceo` review (see
  `docs/governance/architecture-freeze.md`). Only then proceed to code review.
- **No** → proceed directly to code review.

### Release gate (before publish)

See `docs/governance/release-process.md` § "Release Gates". Conformance Suite,
Validator, and Health Check must all pass; the "Approve Release" role signs.

## PR checklist

- [ ] Manifest + providers align (declared engine ⇒ provider present).
- [ ] No import from `@/packs/<other>/*`.
- [ ] For pack-only PRs: no files changed under `src/lib/`, `src/sdk/`, or
  `src/routes/` (except the single-line registration in
  `src/sdk/bootstrap.ts`).
- [ ] `bunx tsgo --noEmit` passes.
- [ ] `bun test src/packs/<iso2>/` passes (conformance + coexistence).
- [ ] Runtime install emits `CountryPackInstalled@1` (verified locally).
- [ ] ADR gate answered (see above).
- [ ] `docs/tech-debt.md` updated if this PR opens or closes debt.

## Related

- `docs/governance/permission-matrix.md`
- `docs/governance/architecture-freeze.md`
- `docs/governance/release-process.md`
- `docs/architecture/repository-strategy.md`
