# Security Policy

References existing controls; do not duplicate SQL policies here.

## Data plane
- **RLS on every `public` table.** Verified in H1 migration. New tables MUST
  ship RLS + explicit `GRANT`s in the same migration.
- **Role storage isolated.** `public.user_roles` + `has_role()` SECURITY
  DEFINER (see project rules); never store roles on `profiles`.
- **Auditor role** is read-only cross-company via `is_auditor()`.

## Server functions
- `requireSupabaseAuth` middleware on every state-changing server fn.
- Admin operations verify the caller's role *before* importing
  `@/integrations/supabase/client.server` (never use the service-role client
  to check "is this user an admin").

## Public APIs
- All external endpoints under `src/routes/api/public/*`.
- Bearer API keys stored as SHA-256 hashes (`api_keys.key_hash`).
- Rate limit + monthly quota via `check_api_quota()` (SECURITY DEFINER).
- CORS: `*` on legacy endpoints; per-key `allowed_origins` on v1 (DEBT-008).

## Compliance
- UU PDP: payroll data encrypted at rest by the platform; access always via RLS.
- Snapshot hashes (`payroll_runs.snapshot_hash`) provide tamper evidence.
