# Rollback Playbook

_Status: **Active** · Owner: `@cto-global` · Effective: Sprint H9-DevOps._

Rollback is a **first-class** operation. Every deploy target has a documented
undo. Use `rollback.yml` (`workflow_dispatch`) to execute it with an audit
trail.

## Decision matrix

| Symptom                                    | Target        | Escalation      |
| ------------------------------------------ | ------------- | --------------- |
| Bad UI / bad JS bundle                     | `app`         | 5 min           |
| Broken edge/server function behaviour      | `edge`        | 15 min          |
| Regression in a Country Pack               | `pack`        | 15 min          |
| Bad migration (schema/data corruption)     | `migration`   | 30 min + DBA    |

Target > 30 min or unclear scope → declare incident, page `@cto-global`.

## 1. App rollback (Vercel)

**Trigger:** `Actions → Rollback → Run workflow`
- `target=app`
- `environment=production` (or `staging`)
- `reference=<previous deployment URL>` (from Vercel dashboard)
- `reason=<short justification>`

Under the hood:

```bash
vercel rollback <deployment-url> --token=$VERCEL_TOKEN --yes
```

Verify: hit `https://app.uboard.app/api/public/v1/health` and confirm
`status=ok` and the expected version.

## 2. Edge/Server Function rollback (Supabase)

**Trigger:** `rollback.yml` with `target=edge`, `reference=<git sha>` of the
last known-good commit.

The workflow checks out that sha's `supabase/functions` directory and
redeploys via:

```bash
supabase functions deploy --project-ref $REF
```

Confirm the function's `/api/public/*` endpoints return expected shapes.

## 3. Country Pack rollback

Packs are versioned per `manifest.version`. Rollback path:

1. Open `hotfix/pack-{iso2}-rollback` from `main`.
2. `git revert` the offending pack commit(s) — touch only
   `src/packs/{iso2}/**`.
3. Bump `manifest.version` (patch) and update `src/packs/{iso2}/CHANGELOG.md`.
4. PR through `release` → `main` with the normal gates.
5. Runtime will re-install the previous provider set on next boot; if
   validation fails, the pack is marked `incompatible` and unloaded
   automatically — customers on that pack see the standing degraded-mode
   banner in `/country-packs`.

**Do not** attempt to hot-patch a pack in production without going through
the pipeline. The `rollback.yml` `target=pack` job intentionally fails to
force the PR flow.

## 4. Migration rollback

Postgres migrations are forward-only by default. Two escape hatches, in
increasing severity:

**a) Reverse migration (preferred).** Write a new migration that undoes the
change (drop the column, restore the constraint, backfill the data). Ship it
through the normal flow. Prefer this whenever the failure is caught before
significant data landed under the new schema.

**b) Snapshot restore (last resort).** Coordinate with the Supabase owner
`@cto-global`. Steps:

1. Freeze writes: put the app in maintenance mode (Vercel env
   `MAINTENANCE=true` + `vercel deploy --prod`).
2. Restore the pre-migration snapshot in the Supabase project (staging
   restore first to validate).
3. Reconcile any data written since the bad migration (manual or via a
   catch-up script).
4. Redeploy the previous app version (see §1).
5. Post-mortem within 48h.

## Auto-block

- Any failed job in `release-validation.yml` or `production-deploy.yml`
  blocks the pipeline (GitHub Actions default).
- The `auto-issue-on-failure` job in both workflows opens a labelled issue
  (`release-blocked` / `production-incident`) so nothing is lost.

## Post-rollback checklist

- [ ] `rollback.yml` audit issue opened and populated.
- [ ] Root cause identified within 24h.
- [ ] Forward fix landed in `develop` with a regression test.
- [ ] Post-mortem in `docs/incidents/` (create if missing) within 72h for
      production incidents.
- [ ] `docs/tech-debt.md` updated if a systemic gap was found.
