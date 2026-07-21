# ADR-0018 — Country Pack Interface v1.0 (frozen contract)

**Status:** Accepted (Sprint H11)

## Context

Removing `bootstrap.ts` in favour of the registry means external Country CTOs
will publish packs directly. Without a stable contract, a new pack can break
the Runtime by shape or by behaviour.

## Decision

Publish `PACK_INTERFACE_VERSION = "1.0.0"` and support the semver range
`^1.0.0`. Packs declare `manifest.interfaceVersion`; the validator rejects
values outside the supported range. The full contract is documented in
`docs/governance/country-pack-interface-v1.md`:

- Provider function signatures.
- Manifest shape (`provides/requires/events/permissions/dependencies`).
- Emitted event catalog membership.
- `ProviderContext` shape (`siblings`, `foreign`, `config`).
- Health check semantics.

Any breaking change requires a new major (`2.0.0`) and dual-support during
transition.

## Consequences

- H11.2 (bootstrap removal) is unlocked without regressing on stability.
- External publishers get a real API contract to build against.
