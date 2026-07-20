# Country Pack Specification

Every pack lives under `src/packs/<iso2>/index.ts` and exports a
`CountryPack` object with three parts: **manifest**, **params**, **providers**.

## Manifest (required)

```yaml
country: ID              # ISO 3166-1 alpha-2
name: Indonesia
currency: IDR
version: 1.7.0           # pack semver (independent from Core)
rulesetVersion: ID-2024.1  # bumps when legal params change
engines:                 # capabilities implemented
  - payroll
  - tax
  - benefits
  - thirteenth
  - overtime
  - calendar
  - contracts
  - audit
  - rules
supportedLanguages: [id, en]
requiresCore: ">=2.0.0"  # semver range
```

## Providers (all optional, must match declared engines)

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

## Rules
- **No cross-pack imports.** `packs/malaysia` must never import from `packs/indonesia`.
- **No Core imports** except from `@/sdk/*` and generic utils (`@/lib/hashing`, etc).
- **Params are opaque** — publish through `pack.params` and consume via provider methods.
- **Manifest.engines must match providers** — the Runtime does not enforce this yet;
  contributors are responsible.
