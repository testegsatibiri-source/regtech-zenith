# Production Environment

Deployed on push to `main` after `production-deploy.yml` passes and manual
approval from required reviewers.

- **Reviewers required:** `@cto-global` AND `@ceo` (both must approve)
- **Wait timer:** 5 minutes (safety window for cancellation)
- **Branch policy:** `main` only
- **Purpose:** live production
- **Points at:** Supabase `uboard-prod` project (isolated DB)

## Secrets (GitHub Environment: `production`)

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Deploy |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | Project routing |
| `SUPABASE_ACCESS_TOKEN` | CLI auth |
| `SUPABASE_PROJECT_REF_PROD` | Target project ref |
| `SUPABASE_DB_PASSWORD_PROD` | Migration push |
| `SUPABASE_SERVICE_ROLE_PROD` | Runtime |
| `JWT_SECRET_PROD` | App signing |
| `PACK_SIGNING_KEY_PROD` | Pack signature verification |

## Rules

- Rotate every 90 days (see `docs/governance/secrets-inventory.md`).
- Never copy production secrets into staging or preview.
- Access limited to the approvers listed above; audit via GitHub environment
  audit log.
