# Secrets Inventory

_Status: **Active** · Owner: `@cto-global` · Rotation cadence: 90 days._

**Rule:** every secret lives in a **GitHub Environment Secret**. Nothing in
source, nothing in `.env` committed, nothing kept only in the Lovable UI.
Runtime env vars in Vercel are populated from these; developers do not hold
long-lived copies.

## Inventory

| Secret                          | Env(s)                | Owner        | Purpose                              | Rotation |
| ------------------------------- | --------------------- | ------------ | ------------------------------------ | -------- |
| `VERCEL_TOKEN`                  | preview/staging/prod  | `@cto-global`| Vercel CLI auth                      | 90d      |
| `VERCEL_ORG_ID`                 | all                   | `@cto-global`| Org routing (non-sensitive)          | —        |
| `VERCEL_PROJECT_ID`             | all                   | `@cto-global`| Project routing (non-sensitive)      | —        |
| `SUPABASE_ACCESS_TOKEN`         | staging/prod          | `@cto-global`| Supabase CLI auth (personal token)   | 90d      |
| `SUPABASE_PROJECT_REF_STAGING`  | staging               | `@cto-global`| Target project ref (non-sensitive)   | —        |
| `SUPABASE_PROJECT_REF_PROD`     | production            | `@cto-global`| Target project ref (non-sensitive)   | —        |
| `SUPABASE_DB_PASSWORD_STAGING`  | staging               | `@cto-global`| Migration push (staging DB)          | 90d      |
| `SUPABASE_DB_PASSWORD_PROD`     | production            | `@cto-global`| Migration push (prod DB)             | 90d      |
| `SUPABASE_SERVICE_ROLE_STAGING` | staging               | `@cto-global`| Server-side privileged (staging)     | 90d      |
| `SUPABASE_SERVICE_ROLE_PROD`    | production            | `@cto-global`| Server-side privileged (prod)        | 90d      |
| `JWT_SECRET_STAGING`            | staging               | `@cto-global`| App JWT signing (staging)            | 90d      |
| `JWT_SECRET_PROD`               | production            | `@cto-global`| App JWT signing (prod)               | 90d      |
| `PACK_SIGNING_KEY_STAGING`      | staging               | `@sdk-maintainers` | Country Pack signature verification | 180d |
| `PACK_SIGNING_KEY_PROD`         | production            | `@sdk-maintainers` | Country Pack signature verification | 180d |
| `LOVABLE_API_KEY_STAGING`       | staging               | `@cto-global`| Lovable AI Gateway (staging)         | 90d      |
| `LOVABLE_API_KEY_PROD`          | production            | `@cto-global`| Lovable AI Gateway (prod)            | 90d      |

Country-pack-specific secrets (per-provider API keys, per-country signing
keys) follow the same convention: `<PACK>_<PURPOSE>_<ENV>`, e.g.
`ID_BPJS_API_KEY_PROD`. Owned by the respective `@country-cto-{iso2}`.

## Rotation procedure

1. Generate new value in the source of truth (Vercel, Supabase, provider).
2. Update the corresponding GitHub Environment Secret.
3. Update the corresponding Vercel env var (staging or production only).
4. Trigger a redeploy on the affected environment.
5. Revoke the old value at the source.
6. Note the rotation date in the environment's audit log entry.

## Actual runtime secrets in use today (platform-hosted)

The table above is the target state. What the running application actually
reads today, and where it lives, is:

| Env var                     | Read by                                                                                  | Custody today            | Portability action |
| --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------ | ------------------ |
| `LOVABLE_API_KEY`           | `src/lib/audit.functions.ts`, `src/lib/uada/**` (inference, embeddings, gateway provider)  | Platform secret vault    | Replace with provider key once the AI provider is centralised |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/integrations/supabase/client.server.ts` (privileged reads/writes)                     | Platform-managed backend | Reissue from the target Supabase project |
| `SUPABASE_URL`              | server-side client bootstrap                                                               | `.env` (non-secret)      | Per-environment value |
| `SUPABASE_PUBLISHABLE_KEY`  | server-side client bootstrap                                                               | `.env` (non-secret)      | Per-environment value |
| `VITE_SUPABASE_*`           | browser client                                                                             | `.env` (non-secret)      | Per-environment value |
| `LOVABLE_ENV`               | environment discrimination                                                                 | Platform-injected        | Map to `NODE_ENV`/`APP_ENV` when hosting elsewhere |

### Country Pack signing keys (custody-critical)

Pack manifests carry a dual Ed25519 signature; the Boot Health Gate refuses a
pack whose signature does not verify against `public.pack_signing_keys`. The
**public** keys are rows in that table. The **private** keys have no home in
this repository by design — they must live in the secret vault:

| Secret                       | Publisher          | Used by |
| ---------------------------- | ------------------ | ------- |
| `ID_PACK_KEY_AUTHOR`         | `uboard-id`        | `scripts/sign-id.ts` |
| `ID_PACK_KEY_COUNTERSIGN`    | `platform-cto-id`  | `scripts/sign-id.ts` |
| `PH_PACK_KEY_AUTHOR`         | `uboard-ph`        | `scripts/sign-ph.ts` |
| `PH_PACK_KEY_COUNTERSIGN`    | `platform-cto-ph`  | `scripts/sign-ph.ts` |

Format: base64-encoded PKCS#8 DER. Bootstrap a pair with
`bun run scripts/sign-id.ts --new-keys` and store the output immediately —
regenerating means rotating the trust-store rows for every published pack.

**Known gap:** the Indonesia keys currently in `public.pack_signing_keys` were
generated ad hoc and were never placed in custody. They must be re-bootstrapped
into the vault (and the trust store rotated once) before launch.

## Forbidden

- Committing any secret value to Git — even in a `.env.example`. Provide
  placeholder names only.
- Copying `_PROD` secrets to `_STAGING` (or vice versa).
- Storing secrets in the Lovable Cloud project when a GitHub Environment
  Secret can serve the same runtime need through Vercel env vars.
- Sharing tokens between humans; each engineer uses their own scoped token
  for local work.

## Related

- `.github/environments/{preview,staging,production}.md`
- `docs/governance/environments.md`
- `docs/governance/security-policy.md`
