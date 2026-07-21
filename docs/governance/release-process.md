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

## Release Gates (H7-Gov)

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

Gates apply to Core releases as well:

- Full `bun test` green.
- `bunx tsgo --noEmit` green.
- No frozen-surface change (see
  `docs/governance/architecture-freeze.md`) without the required ADR.

## Related

- `docs/governance/permission-matrix.md` — "Approve Release" column.
- `docs/governance/architecture-freeze.md` — extra gates for frozen surfaces.
- `docs/governance/contribution-guide.md` — PR workflow feeding this process.
