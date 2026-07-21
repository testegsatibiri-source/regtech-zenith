# Architecture Freeze

_Status: **Active** · Owner: `@cto-global` + `@ceo` · Effective: Sprint H7-Gov._

The surfaces listed below are **frozen**. They may not be modified through a
normal PR — every change requires an approved ADR under
`docs/governance/ADR-XXXX-*.md` **and** sign-off from both `@cto-global` and
`@ceo`.

The goal is to let Country Packs evolve rapidly without destabilising the
substrate they run on. Freezing does **not** mean "never change" — it means
"change only with explicit architectural intent".

## Frozen surfaces

### SDK contracts
- `src/sdk/CountryPack.ts`
- `src/sdk/manifest.ts`
- `src/sdk/providers/*` (every provider interface: Tax, Benefits, Payroll,
  Contracts, Calendar, Audit, Compliance, ThirteenthMonth)
- `src/sdk/Capability.ts`
- `src/sdk/interfaces.ts` (`EXPECTED_INTERFACES`, `capabilitySatisfies`)

### Runtime
- `src/sdk/runtime.ts` (`CountryRuntime`)
- `src/sdk/context.ts` (`ProviderContext` DI)
- `src/sdk/validator.ts`
- `src/sdk/bootstrap.ts` — structure only; adding a
  `CountryRuntime.tryInstall(pack)` line is **not** a freeze violation.

### Event catalog
- `src/sdk/events.ts` (event names, payload shapes, versions)
- `src/lib/events/bus.ts` (bus surface — `emit`, `on`, `off`)

## Not frozen (change freely under normal review)

- Pack internals under `src/packs/**` (params, engine bodies, health checks).
- `rulesetVersion` content and regulatory parameters.
- Core business modules (`src/lib/engines/**` bodies, excluding SDK-contract-shaped types).
- UI (`src/components/**`, `src/routes/**` bodies).
- DB schema and migrations.
- Documentation outside `docs/governance/architecture-freeze.md` and its dependencies.

## Change policy for frozen surfaces

1. Open an ADR: `docs/governance/ADR-XXXX-<slug>.md` describing motivation,
   alternatives considered, migration cost, and rollback plan.
2. PR must be labelled `architecture-change` and reference the ADR.
3. Required reviewers: `@cto-global` **and** `@ceo`.
4. `ci-docs.yml` must pass (link check, cross-references).
5. If the change is breaking, bump `CORE_VERSION` major and update
   `EXPECTED_INTERFACES` in the same PR.

## Escape valve — criteria for platform v3.0

A v3.0 (breaking-by-design) rewrite is justified when **any two** of the
following are true. This list exists so the freeze cannot be argued away
subjectively.

1. **ADR pressure** — at least 3 approved ADRs have accumulated breaking
   changes deferred to "next major".
2. **Capability model insufficient** — a signed contract requires a provider
   surface that cannot be expressed as an additive `Capability` extension.
3. **Lifecycle demand** — more than 5 packs are live in production and the
   optional `lifecycleHooks` fields must become required (state machine
   `Installing → Ready → Deprecated → Disabled → Failed` enforced by the
   Runtime, not declarative).
4. **Isolation demand** — a customer or regulator requires provider execution
   in isolated processes (worker threads, workers) — impossible under the
   current in-process Runtime.

Meeting the criteria opens a **v3.0 planning ADR**; work on v2.x continues in
parallel on `main` until the ADR is approved.

## Related

- `docs/governance/permission-matrix.md` — who signs off.
- `docs/governance/contribution-guide.md` — ADR gate in the PR workflow.
- `docs/governance/release-process.md` — release gates.
- `docs/architecture/repository-strategy.md` — repository-level scope.
