# ADR-0014 — Configuration Service

**Status:** Accepted (H10)

## Decision

Introduce `ConfigService` that orchestrates `ConfigProvider` implementations
by declared precedence. H10 ships:
- `ConfigProvider` interface + `ConfigService` orchestrator
- `StaticConfigProvider` (reads `pack.params`)

Precedence order (higher = wins):
```
1. DatabaseProvider   (customer overrides)   — H12
2. FeatureFlagProvider (env/tenant flags)    — H12
3. EnvironmentProvider (process.env)         — H12
4. StaticConfigProvider (pack defaults)      — H10
```

Providers plug in without touching the service or any pack. The
`ProviderContext` will expose `ctx.config` in H11 so pack providers stop
reading `pack.params` directly.

## Consequences

- Runtime configuration becomes composable and auditable.
- DEBT-022 (per-customer parameters) becomes an additive provider,
  not a Runtime rewrite.
