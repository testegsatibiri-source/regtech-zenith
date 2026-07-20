# Release Process

## Two independent semver streams
- **Core** — `src/sdk/version.ts::CORE_VERSION`. Bump on breaking provider
  interface changes (new required method, renamed field).
- **Pack** — `manifest.version`. Bump per pack when provider *behaviour*
  changes. Params-only changes bump `rulesetVersion`, not `version`.

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
