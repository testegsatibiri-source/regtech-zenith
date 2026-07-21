# Country Pack Specification

Every pack lives under `src/packs/<iso2>/index.ts` and exports a
`CountryPack` object with four parts: **manifest**, **params**, **providers**,
and an optional **health** check. Every pack MUST also ship a conformance
test file under `src/packs/<iso2>/__tests__/conformance.test.ts`.

## Manifest (required)

```yaml
country: ID                # ISO 3166-1 alpha-2
name: Indonesia
currency: IDR
version: 1.8.0             # pack semver (independent from Core)
rulesetVersion: ID-2024.1  # bumps when legal params change

# Capabilities
provides: [payroll, tax, benefits, thirteenth, calendar, contracts, audit, rules]
requires: []               # capabilities needed from other packs
engines: [...]             # DEPRECATED alias for `provides`

# Events (validated against @/sdk/events catalog)
events:
  emits:    [PayrollCalculated@1, PayrollFinalized@1, TaxCalculated@1]
  consumes: [EmployeeUpserted@1, ObligationStatusChanged@1]

# Declarative — Runtime enforcement is planned (DEBT-015)
permissions: [employees.read, payroll.write]
features:    [ter-2024, thr, bpjs]

# Cross-pack dependencies (semver against another pack's `version`)
dependencies: []

# Reserved. Verification planned (DEBT-016).
signature: { publisher: "...", checksum: "sha256:...", algo: sha256 }

# Reserved for Sprint H7 (Lifecycle).
lifecycleHooks: { onInstall: "...", onEnable: "...", onDisable: "..." }

supportedLanguages: [id, en]
requiresCore: ">=2.0.0"
```

## Providers (all optional, must match declared `provides`)

Each provider MUST declare `readonly version: string`. The Compatibility
Validator checks it against `EXPECTED_INTERFACES` (`@/sdk/interfaces.ts`):
same major and `actual.minor >= expected.minor`.

| Capability   | Provider            | Contract                                   |
| ------------ | ------------------- | ------------------------------------------ |
| `tax`        | `TaxProvider`       | `calculate({ monthlyGross, marital, hasNpwp? })` |
| `benefits`   | `BenefitsProvider`  | `calculate({ salary })` → `{ employee, employer }` |
| `payroll`    | `PayrollProvider`   | `buildPayslip(input)`                      |
| `thirteenth` | `ThirteenthProvider`| `calculate({ monthlySalary, monthsOfService })` |
| `calendar`   | `CalendarProvider`  | `templates()` → obligation templates       |
| `contracts`  | `ContractProvider`  | `validate(contract)` + `coverage(...)`     |
| `rules`      | `RuleProvider`      | `rules()` — compliance rules for score     |
| `audit`      | `AuditProvider`     | `heuristics()` — AI audit inputs           |

Every provider method accepts an optional `ctx?: ProviderContext` as its
last argument. When a provider needs sibling data, it reads from `ctx.siblings`
— never by direct import. See ADR-0003.

## Health check (optional but recommended)

```ts
health?(): HealthReport | Promise<HealthReport>
```

Runs on demand (Runtime `/country-packs` UI, `/api/public/v1/health`).
Report:

```ts
{ status: "ok" | "warn" | "error", checks: { name, ok, message? }[] }
```

The Indonesia pack ships checks for params load, ruleset presence,
non-empty calendar/rules, and a live smoke test of `tax.calculate` and
`benefits.calculate`.

## Compatibility Validator

The Runtime calls `validatePack(pack)` on every `install()`. It checks:

- `requiresCore` satisfies the current `CORE_VERSION`
- Every `provides` capability has a matching provider whose `version`
  satisfies `EXPECTED_INTERFACES[capability]`
- `requires` capabilities are declared or resolvable
- Every event in `events.emits/consumes` is in the SDK catalog
- `rulesetVersion` matches `<CC>-YYYY.N`
- Structural check on `signature` when present

`errors` block install (status → `failed`), `warnings` allow install with
status `degraded`. Both are surfaced in the `/country-packs` UI.

## Conformance (ADR-0004)

Every pack MUST include:

```ts
// src/packs/<iso2>/__tests__/conformance.test.ts
import * as path from "node:path";
import { myPack } from "..";
import {
  runManifestSuite,
  runTaxProviderSuite,
  runBenefitsProviderSuite,
  runIsolationSuite,
  ID_TAX_CASES,           // or country-specific fixtures
  ID_BENEFITS_CASES,
} from "@/sdk/testkit";

runManifestSuite(myPack);
runTaxProviderSuite(myPack, ID_TAX_CASES);
runBenefitsProviderSuite(myPack, ID_BENEFITS_CASES);
runIsolationSuite(myPack, path.resolve(__dirname, ".."));
```

Run locally: `bun test src/packs/`.

## Rules
- **No cross-pack imports.** `packs/malaysia` must never import from `packs/indonesia`.
- **No cross-provider imports.** Providers reach siblings only via
  `ProviderContext.siblings` (see ADR-0003).
- **No Core imports** except from `@/sdk/*` and generic utils (`@/lib/hashing`, etc).
- **Params are opaque** — publish through `pack.params` and consume via provider methods.
- **Manifest.provides must match `Object.keys(providers)`** — the Validator will
  warn on drift.
