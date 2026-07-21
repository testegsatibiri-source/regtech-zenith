# Staging Environment

Deployed on push to `release` after `release-validation.yml` passes.

- **Reviewers required:** none (validated by CI gates)
- **Wait timer:** 0
- **Branch policy:** `release`
- **Purpose:** homologação; last stop before production
- **Points at:** Supabase `uboard-staging` project (isolated DB)

## Secrets (GitHub Environment: `staging`)

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Deploy |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | Project routing |
| `SUPABASE_ACCESS_TOKEN` | CLI auth |
| `SUPABASE_PROJECT_REF_STAGING` | Target project ref |
| `SUPABASE_DB_PASSWORD_STAGING` | Migration push |
| `SUPABASE_SERVICE_ROLE_STAGING` | Runtime (if needed) |
| `JWT_SECRET_STAGING` | App signing |
| `PACK_SIGNING_KEY_STAGING` | Pack signature verification |

**Never** mix `_STAGING` and `_PROD` values in the same env.
