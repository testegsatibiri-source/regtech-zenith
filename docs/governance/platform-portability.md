# Platform Portability

_Status: **Active** · Owner: `@cto-global` · Reviewed: 2026-09-01._

Policy: the product runs on the Lovable platform today, but no part of it may
become unrunnable elsewhere. Every platform-specific dependency is listed here
with its replacement path. Adding a new one requires updating this document in
the same PR.

## Dependency register

| Dependency | Call site | Replacement | Status |
| --- | --- | --- | --- |
| `@lovable.dev/cloud-auth-js` — Google OAuth broker | `src/integrations/lovable/index.ts`, `src/routes/auth.tsx` | `supabase.auth.signInWithOAuth("google")` with the provider configured on the Supabase project | Replaceable, one call site |
| AI Gateway `https://ai.gateway.lovable.dev/v1` | `src/lib/audit.functions.ts`, `src/lib/uada/gateway/aiGateway.server.ts`, `src/lib/uada/gateway/embeddings.server.ts`, `src/lib/uada/inference/InferenceService.server.ts` | Any OpenAI-compatible endpoint; the gateway is already spoken to over the OpenAI wire protocol | Replaceable, needs a single provider module |
| `@lovable.dev/vite-tanstack-config` | `vite.config.ts` | Explicit Vite + TanStack Start plugin stack | Replaceable, build-time only |
| `previewAuthStorage.ts` | Supabase browser client | Inert outside the platform preview; default storage applies | No action |
| Managed Supabase backend | everything | Any Supabase project — `supabase db push` reproduces the schema from `supabase/migrations/` | Replaceable, data migration required |
| Platform hosting (Cloudflare worker via Nitro) | deploy | `.github/workflows/production-deploy.yml` already targets Vercel + Supabase CLI | Dormant, needs secrets |

## Invariants

1. **No business logic may import from `@/integrations/lovable/*`.** Only route
   components at the authentication boundary may.
2. **AI calls go through one module.** Direct `fetch` to a provider endpoint
   from feature code is not allowed; `src/lib/audit.functions.ts` is a known
   violation pending remediation.
3. **All schema changes ship as SQL migrations** in `supabase/migrations/`.
   Changes applied only through a console are not portable and are treated as
   drift.
4. **Every runtime secret is registered** in `docs/governance/secrets-inventory.md`
   with its custody location.

## Pre-launch checklist

- [ ] GitHub repository connected; a clean clone builds and typechecks.
- [ ] Runtime secrets exported to an owned vault (see secrets inventory).
- [ ] Country Pack signing keys in custody; `scripts/sign-id.ts` and
      `scripts/sign-ph.ts` run reproducibly in custody mode.
- [ ] Database backup/restore procedure exercised at least once outside the
      platform.
- [ ] One successful staging deploy through `production-deploy.yml`.

## Related

- `docs/governance/secrets-inventory.md`
- `docs/governance/deploy-vercel.md`
- `docs/architecture/repository-strategy.md`
