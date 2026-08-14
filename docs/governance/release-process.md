# Release Process

## Two independent semver streams
- **Core** — `src/sdk/version.ts::CORE_VERSION`. Bump on breaking provider
  interface changes (new required method, renamed field).
- **Pack** — `manifest.version`. Bump per pack when provider *behaviour*
  changes. Params-only changes bump `rulesetVersion`, not `version`.

## Component versioning (H7-Gov)

Each component below versions independently. Changelogs live next to each
component.

| Component        | Version source                         | Changelog                        |
| ---------------- | -------------------------------------- | -------------------------------- |
| Core             | `src/sdk/version.ts::CORE_VERSION`     | `docs/CHANGELOG-core.md`         |
| SDK contracts    | piggybacks on `CORE_VERSION`           | recorded in ADRs                 |
| Pack (per iso2)  | `src/packs/{iso2}/manifest.version`    | `src/packs/{iso2}/CHANGELOG.md`  |
| Ruleset (per iso2)| `manifest.rulesetVersion`             | recorded in the pack's CHANGELOG |

The distinction between `manifest.version` (provider surface) and
`rulesetVersion` (regulatory params) is authoritative — do not conflate.

## Bump rules
| Change                                    | Core | Pack version | rulesetVersion |
| ----------------------------------------- | ---- | ------------ | -------------- |
| New optional Provider method              | minor|      —       |       —        |
| Rename a Provider method                  | major|      —       |       —        |
| Pack adds `benefits` where none existed   |  —   |    minor     |       —        |
| BPJS cap changes                          |  —   |      —       |     patch      |
| PPh 21 TER table replaced by new PMK      |  —   |      —       |     minor      |

## Compatibility check
`CountryRuntime.install(pack)` calls `satisfies(pack.requiresCore, CORE_VERSION)`.
Incompatible packs surface as `status: "incompatible"` in `/country-packs`
and emit `CountryPackFailed@1`.

## Release Gates (H7-Gov / H20)

A Country Pack **MUST NOT** be released — i.e. the release checklist may not
be signed by an "Approve Release" role (see
`docs/governance/permission-matrix.md`) — if any of the following is true:

1. **Conformance Suite fails.** `bun test src/packs/{iso2}/` reports any
   failing test, including coexistence.
2. **Validator errors.** `validatePack(pack)` returns `errors.length > 0`.
   Warnings are permitted but MUST be listed in the release notes with a
   justification.
3. **Health Check fails.** `pack.health(ctx)` returns any check with
   `status: "error"`. `warn` is permitted but MUST be documented.
4. **Commercial readiness mismatch (H20).** If the manifest declares
   `commercialReady: true`, the release approver MUST attach evidence that the
   pack's calculation engines are backed by real statutory tables/rates
   (e.g. BIR, SSS, DOLE, BPJS) and not by simplified or clamped heuristics. A
   `commercialReady: true` declaration with a simplified engine is a release
   blocker and is considered a signing-material integrity issue. Packs that are
   not yet commercially accurate remain `commercialReady: false` and live in the
    `Validation` tier.
5. **Statutory source evidence (H21).** For any pack whose `rulesetVersion` changes in a release, the release approver MUST attach a citation (URL, circular number, or DOF/BIR/SSS/DOLE reference) for each table, cap, or bracket that changed. A rulesetVersion bump without a source citation is a release blocker, and the pack must remain `commercialReady: false`.


Gates apply to Core releases as well:


- Full `bun test` green.
- `bunx tsgo --noEmit` green.
- No frozen-surface change (see
  `docs/governance/architecture-freeze.md`) without the required ADR.

## Pipeline (Sprint H9-DevOps)

The gates above are enforced by the workflows in `.github/workflows/`:

- `ci-feature.yml` — PR to `develop` (typecheck, lint, unit, conformance, validator, build).
- `ci-develop.yml` — push `develop` → deploy Preview.
- `release-validation.yml` — push `release` → migration dry-run + deploy Staging.
- `production-deploy.yml` — push `main` → migration apply + deploy Production (gated by `production` environment approval).
- `rollback.yml` — `workflow_dispatch` for app / edge / pack / migration.

See `docs/adr/ADR-0009-production-pipeline.md` and
`docs/governance/rollback-playbook.md`.

## Related

- `docs/governance/permission-matrix.md` — "Approve Release" column.
- `docs/governance/architecture-freeze.md` — extra gates for frozen surfaces.
- `docs/governance/contribution-guide.md` — PR workflow feeding this process.
- `docs/governance/branch-protection.md` — GitFlow enforcement.
- `docs/governance/environments.md` — env × secrets × reviewers matrix.
- `docs/governance/secrets-inventory.md` — secret ownership and rotation.
- `docs/governance/rollback-playbook.md` — undo procedures.
