# Repository Strategy

_Status: **Active** · Owner: `@cto-global` · Effective: Sprint H7-Gov._

## Decision

**Monorepo now.** Core, SDK, Runtime, and all Country Packs live in a single
GitHub repository until one of the exit criteria below is met.

Rationale: at this stage the SDK contract is still stabilising (see
`architecture-freeze.md`), and coupling Core + Packs in one PR pipeline is the
cheapest way to catch breaking changes across the SDK boundary.

## Exit criteria (any one triggers a split *evaluation*, not an automatic split)

1. **External maintainer** — a Country Pack is maintained by an organisation
   outside the workspace (partner, integrator, regulator).
2. **Independent release cadence** — a pack ships more than 2× the Core release
   rhythm for two consecutive quarters.
3. **Contractual isolation** — a customer or regulator requires the pack's
   source, history, or access log to be isolated from the rest of the codebase.
4. **Team scale** — more than 5 full-time contributors are dedicated to a
   single pack.

Meeting a criterion opens an ADR proposing the split. The default answer is
still "stay monorepo" unless the ADR proves otherwise.

## Folder layout

```
/src
  /lib          Core (business logic, HTTP, observability, auth)
  /sdk          Frozen SDK contracts (see architecture-freeze.md)
  /packs
    /indonesia
    /philippines
    /malaysia
  /routes       TanStack file routes (Core surface)
/docs
  /architecture   Strategic decisions (frozen surface reference)
  /governance     ADRs, policies, workflows
/.github          CODEOWNERS, PR template, workflows
```

## Import rules

- **Core** may import from `@/sdk/*` only. Core never imports from `@/packs/*`.
- **SDK** is standalone. No imports from `@/lib/*` or `@/packs/*`.
- **Packs** may import from `@/sdk/*` and their own folder. A pack **never**
  imports from another pack or from `@/lib/*`.
- Registration is the sole exception: `src/sdk/bootstrap.ts` imports each
  pack's default export.

Enforcement: reviewed by CODEOWNERS + `ci-core.yml` / `ci-sdk.yml` /
`ci-packs.yml` path guards.

## Branch conventions

| Prefix         | Purpose                                     |
| -------------- | ------------------------------------------- |
| `main`         | Protected. Direct pushes disabled.          |
| `feat/*`       | New Core or SDK feature.                    |
| `fix/*`        | Bug fix.                                    |
| `pack/{iso2}/*`| Pack-only work (no Core edits allowed).     |
| `chore/*`      | Deps, config, refactors without behaviour.  |
| `docs/*`       | Documentation-only.                         |

## Versioning & publication

- **Core** — `src/sdk/version.ts::CORE_VERSION` (semver).
- **SDK contracts** — piggyback on Core semver until a split is triggered.
- **Pack** — `manifest.version` (semver, independent per pack).
- **Ruleset** — `manifest.rulesetVersion` (params-only changes).

Packs are published **in-repo**: consumers depend on the deployed application,
not on an npm registry. When exit criterion #1 or #3 is met, publication
switches to a registry per the ADR that closes this policy.

## Related documents

- `docs/governance/architecture-freeze.md` — what cannot change in-repo.
- `docs/governance/permission-matrix.md` — who can approve what.
- `docs/governance/contribution-guide.md` — PR workflow, ADR gate.
- `docs/governance/release-process.md` — release gates.
