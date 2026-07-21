# Preview Environment

Automatic Vercel deployment on every PR to `develop` (via `ci-develop.yml` after
merge, and per-PR via Vercel's Git integration).

- **Reviewers required:** none
- **Wait timer:** 0
- **Branch policy:** any
- **Purpose:** ephemeral preview for review + smoke testing

## Secrets (GitHub Environment: `preview`)

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Vercel CLI auth |
| `VERCEL_ORG_ID` | Vercel org |
| `VERCEL_PROJECT_ID` | Vercel project |

The preview environment must NEVER hold production Supabase credentials.
