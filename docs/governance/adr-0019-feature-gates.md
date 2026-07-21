# ADR-0019 — Platform Feature Gates

**Status:** Accepted (Sprint H11)

## Context

H10 introduced multiple layers whose activation must be independent per
environment. Shipping them "always on" in production increases blast radius.

## Decision

Introduce a `platform_feature_gates` table (per-environment rows) and a
`FeatureGates` in-memory registry hydrated by the Boot Health Gate. Five
gates ship with H11:

| Gate | Preview | Staging | Production | Purpose |
|------|---------|---------|------------|---------|
| `registry_enabled`     | on  | on  | off | Read packs from `pack_registry` (H11.1 coexistence). |
| `compatibility_matrix` | on  | on  | off | Enforce Matrix v1 on boot/install. |
| `signature_enforce`    | off | off | off | Turn `PACK_SIG` warnings into blocking errors. |
| `config_service`       | on  | on  | on  | Route provider config through `ConfigService`. |
| `bootstrap_compare`    | on  | on  | on  | H11.1 shadow-mode comparison bootstrap vs registry. |

Rollout strategy is documented per-gate; production flips require a
`platform_admin` audit entry.

## Consequences

- Every H11 behaviour change is reversible without redeploy.
- Rollback is a DB update, not a code change.
- Post-H11.2 the `bootstrap_compare` gate is removed.
