# Country Pack Interface v1.0

**Status:** Frozen (Sprint H11 — ADR-0018)
**Contract identifier:** `PACK_INTERFACE_VERSION = "1.0.0"`
**Supported range on Core:** `^1.0.0`

This document is the source of truth for what a Country Pack MUST expose in
order to be installable by the Runtime. Breaking changes require a new major
version and dual-support during transition.

## Manifest

```ts
interface CountryManifest {
  country: string;              // ISO 3166-1 alpha-2
  name: string;
  currency: string;             // ISO 4217
  version: string;              // pack semver
  rulesetVersion: string;       // "<CC>-YYYY.N"
  provides: Capability[];
  requires?: Capability[];
  events?: { emits?: SdkEventType[]; consumes?: SdkEventType[] };
  permissions?: string[];
  features?: string[];
  dependencies?: PackDependency[];
  signature?: PackSignature;
  supportedLanguages: string[]; // BCP-47
  requiresCore: string;         // semver range
  interfaceVersion: string;     // MUST satisfy ^1.0.0
}
```

## Providers

Each capability declared in `provides` MUST supply the matching provider slot
on `pack.providers`. Provider methods accept an optional `ProviderContext`
second argument.

| Capability | Provider slot | Version key |
|------------|---------------|-------------|
| `tax`         | `tax`         | `1.0`  |
| `benefits`    | `benefits`    | `1.0`  |
| `payroll`     | `payroll`     | `1.0`  |
| `thirteenth`  | `thirteenth`  | `1.0`  |
| `calendar`    | `calendar`    | `1.0`  |
| `contracts`   | `contracts`   | `1.0`  |
| `audit`       | `audit`       | `1.0`  |
| `rules`       | `rules`       | `1.0`  |

## ProviderContext

Providers receive an injected context (v1.0 shape):

```ts
interface ProviderContext {
  country: string;
  rulesetVersion: string;
  siblings: Providers;
  foreign: (code: string, capability: Capability) => unknown;
  config?: ConfigService;
}
```

## Events

`manifest.events.emits` and `consumes` MUST reference values in
`SDK_EVENT_TYPES`. Unknown events fail validation.

## Health

Optional `pack.health(): HealthReport | Promise<HealthReport>`. Runtime
degrades a pack whose health throws or returns `status: "error"`.

## Stability guarantees

- Method signatures listed here are frozen until v2.0.
- Adding OPTIONAL fields (manifest or provider input) is a MINOR bump.
- Removing or renaming anything is a MAJOR bump.
- The `interfaceVersion` field is REQUIRED for packs published after H12; H11
  emits a warning if missing.
