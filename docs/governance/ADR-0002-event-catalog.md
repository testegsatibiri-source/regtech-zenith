# ADR-0002 — Event Catalog Versioning

**Status:** Accepted (Sprint H5)

## Decision
Every domain event name ends with `@N` (e.g. `PayrollCalculated@1`). Breaking
payload changes bump `N`; both versions may run in parallel during migration.
The canonical catalog lives at `src/sdk/events.ts`. `src/lib/events/bus.ts`
re-exports the SDK union — no domain-specific event types outside the SDK.

## Rules
- Never mutate an existing `@N` shape. Add fields as optional; remove nothing.
- Breaking change → publish `@(N+1)`, keep `@N` emitting until all consumers move.
- Handlers subscribe by exact `type` string (`on("PayrollCalculated@1", …)`).
