# Environments

_Status: **Active** · Owner: `@cto-global` · Effective: Sprint H9-DevOps._

Three GitHub Environments back the three deploy targets. Each environment
owns its secrets and reviewers; nothing crosses over.

| Env          | Trigger                    | Vercel target | Supabase project | Required reviewers    | Wait |
| ------------ | -------------------------- | ------------- | ---------------- | --------------------- | ---- |
| `preview`    | PR to `develop`            | Preview       | `uboard-staging` (read-only where possible) | — | 0m |
| `staging`    | Push to `release`          | Staging alias | `uboard-staging` | — (CI-gated)          | 0m |
| `production` | Push to `main`             | Production    | `uboard-prod`    | `@cto-global` + `@ceo`| 5m |

Detailed secret matrices live in `.github/environments/{preview,staging,production}.md`.

## Rules

1. **Isolation.** Staging and production point at **different** Supabase
   projects. Never share a database.
2. **Suffix convention.** All secrets end in `_STAGING` or `_PROD`. A workflow
   that touches production may only read `*_PROD` secrets.
3. **Reviewer separation.** Production reviewers must not be the same person
   who opened the deploy PR (enforce "Prevent self-review" in env settings).
4. **Audit.** Every deploy generates a workflow run traceable via `github.run_id`;
   rollbacks additionally open an audit issue (see `rollback.yml`).

## Reference

- `docs/governance/branch-protection.md`
- `docs/governance/deploy-vercel.md`
- `docs/governance/secrets-inventory.md`
- `docs/governance/rollback-playbook.md`
