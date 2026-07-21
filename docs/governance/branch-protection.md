# Branch Protection

_Status: **Active** · Owner: `@cto-global` · Effective: Sprint H9-DevOps._

## GitFlow branches (perene)

| Branch    | Purpose                                    | Deploy target |
| --------- | ------------------------------------------ | ------------- |
| `main`    | Live production. Tagged releases only.     | Production    |
| `release` | Homologação; integration for next release. | Staging       |
| `develop` | Continuous integration of features.        | Preview       |

## Prefixos permitidos

| Prefix               | Target base | Notes                              |
| -------------------- | ----------- | ---------------------------------- |
| `feature/{iso2}/*`   | `develop`   | Country pack work                  |
| `feature/core/*`     | `develop`   | Core / SDK work                    |
| `fix/*`              | `develop`   | Bug fix                            |
| `chore/*`            | `develop`   | Deps, config                       |
| `docs/*`             | `develop`   | Docs-only                          |
| `hotfix/*`           | `main`      | Emergency prod fix; back-merge     |

## Protection rules (aplicar no GitHub UI)

### `main`
- Require PR before merge
- Require review from CODEOWNERS
- Require approvals: **2** (`@cto-global` + `@ceo` for architecture-freeze
  paths; otherwise `@cto-global`)
- Require status checks: `Production Deploy / full-ci`, `CI · Core`, `CI · SDK`,
  `CI · Country Packs`, `CI · Docs`
- Require linear history
- Require signed commits
- Restrict who can push: only merge queue / release manager
- Block force pushes and deletions

### `release`
- Require PR before merge
- Require approvals: **1** from `@cto-global`
- Require status checks: `Release Validation → Staging / full-ci`
- Require linear history
- Block force pushes and deletions

### `develop`
- Require PR before merge
- Require approvals: **1** from CODEOWNERS
- Require status checks: `CI · Feature / validate`
- Block force pushes and direct commits

## Flow

```text
feature/*  --PR-->  develop  --PR-->  release  --PR-->  main
                                              (homolog)      (deploy)
hotfix/*   --PR-->  main    (back-merge to release + develop)
```

## Enforcement

- CODEOWNERS enforces reviewer selection (`.github/CODEOWNERS`).
- Status checks enforced via workflows in `.github/workflows/`.
- Environment-level approvals enforced via GitHub Environments (see
  `docs/governance/environments.md`).
