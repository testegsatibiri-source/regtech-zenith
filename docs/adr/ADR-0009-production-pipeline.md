# ADR-0009 — Production Pipeline

**Status:** Accepted (Sprint H9-DevOps, 2026-07-21)
**Owner:** `@cto-global`

## Context

Prior sprints (H5 → H8-BO) delivered the Compliance SDK, Country Pack
runtime, and Backoffice surface. The delivery pipeline still relied on:

- Direct pushes to `main` in some workflows.
- A single Supabase project shared between environments.
- Ad-hoc Vercel deploys driven by the Git integration alone (no migration
  gate, no health check).
- Secrets scattered across developer machines, Vercel UI, and the Lovable
  project settings.
- No documented rollback path for the app, edge functions, packs, or
  migrations.

That footing does not scale to a multi-CTO organisation (Indonésia,
Filipinas, Malásia, ...) where independent teams push in parallel and
compliance-critical code lands weekly.

## Decision

Adopt a **GitFlow-based production pipeline** with three protected branches,
three isolated deploy environments, a dual-Supabase-project topology, and
centralised secrets — all enforced by GitHub Actions and branch protection
rules.

### 1. Branches (see `branch-protection.md`)
- `develop` — integration; deploys to Preview.
- `release` — homologação; deploys to Staging.
- `main` — production; deploys to Production after approval.

### 2. Environments (see `environments.md`)
- `preview` / `staging` / `production` as GitHub Environments, each with its
  own secrets and reviewers. Production requires `@cto-global` + `@ceo`.

### 3. Pipelines
Five workflows: `ci-feature`, `ci-develop`, `release-validation`,
`production-deploy`, `rollback`. Existing component pipelines
(`ci-core`, `ci-sdk`, `ci-packs`, `ci-docs`) remain as fast per-scope
signals.

### 4. Supabase topology
Two projects: `uboard-staging` and `uboard-prod`. No shared database.
Migrations are applied to staging on every `release` push and to production
only via the gated `production-deploy` workflow.

### 5. Secrets (see `secrets-inventory.md`)
All secrets stored as GitHub Environment Secrets with a `_STAGING` /
`_PROD` suffix convention. Nothing in source, nothing in `.env` committed,
no long-lived copies on developer machines.

### 6. Rollback (see `rollback-playbook.md`)
`rollback.yml` provides `workflow_dispatch` rollback for `app`, `edge`,
`pack`, and `migration` targets, each with an audit trail.

## Consequences

**Positive**
- Zero direct commits to protected branches; every change gated by CI.
- Staging always represents the next release; production is a promotion,
  never a first deploy.
- Rollback becomes routine, not heroic.
- Secret ownership is explicit and rotable.
- Multi-CTO flow scales: `feature/{iso2}/*` → `develop` → `release` →
  `main` with country-specific reviewers via CODEOWNERS.

**Negative / cost**
- Doubles Supabase cost (two projects).
- Adds ~2–5 min to release cycle time (migration + health check gates).
- Requires org-side setup that Actions cannot do (branch protection,
  environment reviewers, Vercel custom domains).

## Out of scope for this ADR
- Terraform/IaC to provision GitHub/Vercel/Supabase (future ADR-0010).
- Full E2E suite (only smoke tests here).
- External observability stack (Datadog/Sentry) — separate ADR.

## Related documents
- `docs/governance/branch-protection.md`
- `docs/governance/environments.md`
- `docs/governance/deploy-vercel.md`
- `docs/governance/secrets-inventory.md`
- `docs/governance/rollback-playbook.md`
- `docs/governance/release-process.md`
- `docs/governance/permission-matrix.md`
