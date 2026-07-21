# ADR-0005 — Capability Versioning & Expanded Manifest

**Status:** Accepted (Sprint H6, 2026-07-20)

## Context

Sprint H5 gated pack installation on a single `requiresCore` semver range.
This is too coarse: a breaking change in `TaxProvider` v2 forces a Core
major bump even when every other capability is untouched. Meanwhile the
manifest only carried `engines: Capability[]`, so the Runtime could not
answer questions like "which events does this pack emit?", "what does it
require from other packs?", "what permissions is it declaring?".

## Decision

### 1. Per-capability interface versioning

- Each provider interface has a required `readonly version: string` field.
- The SDK exports `EXPECTED_INTERFACES: Record<Capability, string>` naming
  the minimum acceptable version per capability.
- The Compatibility Validator enforces same-major + `actual.minor >=
  expected.minor` for every declared capability.
- Bumping `EXPECTED_INTERFACES.tax` from `"1.0"` to `"1.1"` requires all
  packs providing `tax` to advertise ≥ 1.1.

### 2. Expanded manifest fields

```ts
interface CountryManifest {
  provides: Capability[]              // authoritative capability list
  requires?: Capability[]             // capabilities pulled from other packs
  events?: { emits?, consumes? }      // SDK event catalog membership
  permissions?: string[]              // declarative (enforcement in H7)
  features?: string[]                 // free-form flags
  dependencies?: { pack, range }[]    // cross-pack semver
  signature?: { publisher, checksum, algo }   // reserved; verification in H7+
  lifecycleHooks?: { onInstall?, onEnable?, onDisable? }  // reserved for H7
}
```

`engines: Capability[]` is retained as a deprecated alias of `provides`
for one minor version.

## Consequences

- Independent evolution of capabilities.
- The Runtime becomes introspectable: `/country-packs` UI, `/api/public/v1/health`
  and future marketplace surfaces can render "which packs emit `PayrollFinalized@1`",
  "which packs need `expat-visa`".
- Enforcement of `permissions` and verification of `signature` are tracked
  as DEBT-015 and DEBT-016 — the contract exists, verification lands later.
- Core version bumped 2.0.0 → 2.1.0 (backward-compatible additions only;
  `engines` alias preserves existing packs).
