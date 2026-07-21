# ADR-0012 — Pack Marketplace Lifecycle & Compatibility Service

**Status:** Accepted (H10)

## Decision

### Lifecycle (8 states)
```
Experimental → Draft → Review → Approved → Published → Deprecated → Yanked → Archived
```

- **Experimental** — visible only to author + `platform_admin`; permits
  iterative development without polluting the marketplace.
- **Draft** — author signature required.
- **Review** — compatibility check must pass.
- **Approved** — countersignature + compatibility.
- **Published** — trust policy for the current environment must be satisfied.
- **Deprecated / Yanked / Archived** — retirement paths.

State machine lives in `src/sdk/lifecycle.ts`; transitions are validated by
the platform packs service and logged in `pack_lifecycle_events`.

### Compatibility Service
```
Registry ──► CompatibilityService ──► Runtime
              ├─ interface & core version
              ├─ dependencies
              ├─ validator
              └─ signatures × TrustPolicy
```

Runtime keeps the same `install(pack)` signature but delegates all go/no-go
decisions to `CompatibilityService`. This isolates Runtime from marketplace
policy changes and lets future decisions (matrix, budgets) be added without
touching the Runtime.

### Two-phase migration to Registry-only
- **H10 (this sprint)** — `bootstrap.ts` and `pack_registry` coexist.
  `CompatibilityService` runs against both paths. Divergences emit
  `PackCompatibilityDivergence@1`.
- **H11** — Runtime hydrates exclusively from `pack_registry`; `bootstrap.ts`
  removed. Pre-req: 2+ weeks with zero divergence events.

## Consequences

- Zero brick risk when introducing the Registry.
- Marketplace policy evolves without Runtime changes.
- Lifecycle state is fully auditable via `pack_lifecycle_events`.
