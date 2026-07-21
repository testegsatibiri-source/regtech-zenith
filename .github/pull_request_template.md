# Pull Request

## Summary
<!-- One paragraph: what and why. -->

## Scope
- [ ] Core (`src/lib/**`, `src/routes/**`)
- [ ] SDK / Runtime (`src/sdk/**`)
- [ ] Country Pack: `src/packs/____/**`
- [ ] Docs only
- [ ] CI / config

## ADR gate

Does this change touch **any** of: SDK contracts, Runtime, Provider
interfaces, Manifest schema, or the event catalog?

- [ ] **No** — proceed to code review.
- [ ] **Yes** — architecture review required. ADR: `docs/governance/ADR-____.md`

## Checklist

- [ ] `bun test` green.
- [ ] `bunx tsgo --noEmit` green.
- [ ] If this is a **pack-only** PR: **no** files under `src/lib/`,
  `src/sdk/`, or `src/routes/` are modified (except a single-line
  `CountryRuntime.tryInstall()` in `src/sdk/bootstrap.ts`).
- [ ] `docs/tech-debt.md` updated if new debt was introduced or closed.
- [ ] If a frozen surface changed (see
  `docs/governance/architecture-freeze.md`): ADR filed, `@cto-global` **and**
  `@ceo` review requested.
- [ ] If this is a **release** PR: gates in `docs/governance/release-process.md`
  satisfied (Conformance Suite, Validator, Health Check).

## Related

<!-- Links to issues, ADRs, prior PRs. -->
