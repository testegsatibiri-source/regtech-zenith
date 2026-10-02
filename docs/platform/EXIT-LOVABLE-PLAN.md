# UBoard Asia — Platform Exit from Lovable

## Goal

Move the operational application from Lovable-hosted runtime/database to a controlled platform based on GitHub, GitHub Actions, Vercel, and Supabase, without interrupting the existing test deployment before replacement is proven.

## Current known state

- GitHub repository: `testegsatibiri-source/regtech-zenith`
- Default branch: `main`
- Supabase staging candidate: `lyjxnceaoaivnantwmni` (`UBoardAsia`, `ap-southeast-1`)
- No confirmed dedicated Supabase production project yet.
- `supabase/config.toml` currently references `vavcyfcmkvimxxwpkuck`; do not run CLI migrations until this reference is reconciled.
- `vite.config.ts` imports `@lovable.dev/vite-tanstack-config`; removing Lovable requires a deliberate build/runtime replacement, not just changing hosting.
- Current workflows include `ci-shared.yml`, `release-validation.yml`, and `production-deploy.yml`. The deploy workflows must be hardened before real secrets are enabled.

## Non-negotiable migration controls

1. Keep the existing Lovable deployment available until independent staging passes acceptance tests.
2. Never point staging and production at the same Supabase project.
3. Never copy production data into developer/test environments by default; use synthetic fixtures unless an approved migration requires otherwise.
4. Do not apply production migrations before the candidate application build and release checks pass.
5. Missing infrastructure credentials must fail the release gate, not silently turn deployment into a successful skip.
6. No `force_deploy` bypass for required checks.
7. The application server must enforce authorization and tenant/country boundaries; UI-only hiding is not an access control.
8. Country Pack implementation/test evidence must not be treated as proof of regulatory correctness or production qualification.

## Phases and exit criteria

### Phase 0 — Inventory

- Map Lovable auth, database, Edge Functions, storage, environment variables, OAuth redirects, and runtime-specific imports.
- Confirm migrations, extensions, RLS policies, triggers, scheduled jobs, buckets, and secrets for staging.
- Identify production project and data migration requirements.
- No production changes.

### Phase 1 — CI baseline

- Pin Bun to the package manager version in `package.json`.
- Require typecheck, lint, tests, and Vercel-target build in shared CI.
- Use protected pull requests and independent review for sensitive changes.
- CI must fail closed.

### Phase 2 — Supabase environments

- Validate staging project reference and migration history.
- Create/confirm a separate production project only after organization, region, and cost are confirmed.
- Keep secrets environment-scoped and least-privileged.

### Phase 3 — Vercel staging

- Create and link the Vercel project to the GitHub repository.
- Use GitHub Actions as the only authorized production deployment path.
- Publish a preview/staging deployment with staging-only Supabase variables.
- Run auth, onboarding, tenant isolation, Country Pack selection, API, storage, and health-check smoke tests.

### Phase 4 — Production release

- Require protected GitHub Environment approval.
- Build and validate the immutable candidate before applying compatible migrations.
- Deploy, health-check, monitor, and retain rollback evidence.

### Phase 5 — Lovable exit

- Replace Lovable-specific build/runtime/auth integrations after code-level audit.
- Verify clean install/build outside Lovable.
- Migrate only approved required data and verify counts/integrity.
- Cut over DNS only after acceptance; keep rollback path until stable.
- Remove old services only after confirming no dependencies remain.

## Current stop conditions

- Supabase CLI project reference is unresolved.
- Dedicated production Supabase project is not confirmed.
- Vercel project and team/org IDs are not yet confirmed.
- Lovable-specific build/auth dependency remains in the source.
- Production workflows still need fail-closed hardening.
