# Vercel Deployment

_Status: **Active** · Owner: `@cto-global`._

## Project setup

Single Vercel project (`uboard`), three environments driven from Git:

| Vercel env  | Git source        | Alias                     |
| ----------- | ----------------- | ------------------------- |
| Preview     | PRs + `develop`   | auto-generated per deploy |
| (Staging)   | `release`         | `staging.uboard.app`      |
| Production  | `main`            | `app.uboard.app`          |

Vercel does not have a first-class "staging" environment; we model it as a
Preview deploy from the `release` branch aliased to `staging.uboard.app`.

## Env vars per environment

Configured in Vercel Project Settings → Environment Variables. Values are
distinct per environment; never re-use production values elsewhere.

| Var                          | Preview                 | Staging (release) | Production |
| ---------------------------- | ----------------------- | ----------------- | ---------- |
| `VITE_SUPABASE_URL`          | staging URL             | staging URL       | prod URL   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | staging publishable  | staging publishable | prod publishable |
| `VITE_SUPABASE_PROJECT_ID`   | staging ref             | staging ref       | prod ref   |
| `SUPABASE_SERVICE_ROLE_KEY`  | (unset)                 | staging service   | prod service |
| `JWT_SECRET`                 | staging value           | staging value     | prod value |
| `LOVABLE_API_KEY`            | staging                 | staging           | prod       |

Secret values come from GitHub Environment Secrets during CI; Vercel-hosted
copies exist only when Vercel's Git integration runs a deploy directly (e.g.
PR previews).

## CLI workflow (used by `.github/workflows/*.yml`)

```bash
vercel pull --yes --environment={preview|production} --token=$VERCEL_TOKEN
vercel build [--prod]
vercel deploy --prebuilt [--prod]
```

Aliasing:

```bash
vercel alias set <deployment-url> staging.uboard.app
```

## Promotion & rollback

- Promotion between envs happens via Git (merge to next branch), never via
  `vercel promote`.
- Rollback uses `vercel rollback <deployment-url>` — see
  `rollback-playbook.md`.

## Manual actions

Initial setup requires:
1. Create Vercel project connected to the repo.
2. Disable Vercel's automatic production deploy from `main` (we drive it via
   Actions to gate on migrations + health check).
3. Add `staging.uboard.app` and `app.uboard.app` custom domains.
4. Populate env vars per table above.

## Deployment gating (Sprint H12.1)

While the project runs on Lovable-managed infrastructure, GitHub Secrets for
Vercel/Supabase are intentionally not populated. To avoid noisy red CI runs,
`ci-develop.yml`, `release-validation.yml`, and `production-deploy.yml` each
run a `preflight` job that inspects the required secrets and emits
`outputs.ready`:

- **Secrets present** → deploy jobs run normally.
- **Secrets missing** → deploy jobs are skipped (grey, not red). The workflow
  summary explains: _"Deployment skipped because production infrastructure is
  not configured yet (missing GitHub Secrets). CI completed successfully."_
  No auto-issue is opened.
- **Manual override** → `workflow_dispatch` also honours the preflight by
  default. To force a deploy attempt without secrets (debug only), trigger
  the workflow with `force_deploy: true`. `production-deploy.yml`
  additionally requires `confirm_production: PRODUCTION`.

To re-enable automatic deploys later: populate the secrets listed in
`docs/governance/secrets-inventory.md` inside the matching GitHub Environment
(`preview` / `staging` / `production`). No YAML changes needed.

