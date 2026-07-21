# ADR-0011 — Capabilities-first IAM

**Status:** Accepted (H10)
**Context:** Hard-coded role checks in policies (`hasRole(ctx, "platform_admin")`)
do not scale to external partners, auditors, or pack publishers. Each new actor
type currently requires editing `PermissionService` code.

## Decision

Authorization decisions are expressed as **capabilities** (e.g. `pack.sign`,
`parameters.import`), and roles are just named bundles of capabilities.

- `public.role_capabilities` maps `role → capability` with a `scope` of
  `global` or `country`.
- `public.has_capability(user_id, capability, country_code)` resolves at the DB
  layer for RLS use.
- `src/lib/platform/capabilities.ts` mirrors the seed map for zero-round-trip
  client rendering. Server-side authorization always reads the DB.
- Existing policy actions (`pack.view`, etc.) map 1:1 to capabilities;
  PermissionService keeps the same `check/ensure` surface.

## Consequences

- Adding a partner/auditor role = INSERT rows into `role_capabilities`; no
  code change to `PermissionService`.
- Capabilities can be split per environment or product later without
  breaking call sites.
- Two sources of truth (DB + local mirror) — kept aligned by convention;
  drift is caught by a conformance test in `src/sdk/testkit`.
