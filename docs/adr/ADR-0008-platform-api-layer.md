# ADR-0008 — Platform APIs (thin server-fn wrappers)

- **Status:** Accepted (Sprint H8-BO)
- **Date:** 2026-07-21
- **Deciders:** Platform

## Context

Without a shared API layer, three anti-patterns emerge:

1. The UI reaches directly into `@/sdk/runtime.ts`, coupling the browser to
   in-memory server state and bypassing authorization.
2. Automation (future CLI, cron, pipeline) reimplements the same authorization
   and validation logic.
3. Testing has no seam: every test must instantiate the full Runtime.

## Decision

All Backoffice traffic goes through **thin `createServerFn` wrappers** in
`src/lib/platform/api.functions.ts`:

```text
UI ──► api.functions (Zod + auth middleware) ──► Application Service ──► Runtime/DB
```

Rules:

- The UI **must not** import `@/sdk/*`. It calls server fns via
  `useServerFn`.
- API functions do **only** three things: validate input (Zod), build the
  `PlatformContext`, delegate to the service. No business logic.
- Authorization happens inside the service via `PermissionService.ensure()`
  — never in the API layer, never in the UI.
- Audit entries are written by the service, not the API layer.

## Consequences

- **+** Single call surface reusable by UI, CLI, pipelines.
- **+** Deny-by-default authorization; policies are the only place role logic
  lives.
- **+** DTOs are JSON-serializable by construction (validated by TanStack
  Start's serializer type check), which keeps the RPC boundary honest.
- **−** Small amount of boilerplate per endpoint; considered a fair trade for
  the guarantees above.
