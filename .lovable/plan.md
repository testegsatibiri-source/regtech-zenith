# Sprint H9-DevOps — Production Pipeline

Objetivo: transformar o repositório num pipeline production-grade com GitFlow protegido, três ambientes isolados (preview/staging/production), Supabase dual-project, secrets centralizados no GitHub e rollback controlado. **Zero mudanças em código de negócio** — apenas governança, CI/CD, infra e documentação.

## Entregáveis

### 1. GitFlow e Branch Protection
- Formalizar 3 branches perenes: `main` (prod), `release` (homologação), `develop` (integração).
- Prefixos padronizados: `feature/{iso2}/*`, `fix/*`, `chore/*`, `docs/*`, `hotfix/*`.
- Regras de proteção (documentadas em `docs/governance/branch-protection.md`, aplicadas via GitHub UI/Terraform):
  - PR obrigatório, 1+ review, CODEOWNERS enforcement, status checks verdes, linear history, no force-push, no direct commit.
  - `main` e `release`: aprovação extra do `@cto-global`.
- Estender `.github/CODEOWNERS` com novos paths (`.github/environments/**`, `infra/**`).

### 2. GitHub Environments
Criar 3 environments com secrets e reviewers próprios:
- `preview` — auto-deploy em cada PR, sem gate.
- `staging` — deploy automático ao mergear em `release`.
- `production` — deploy manual após merge em `main`, com **required reviewers** (`@cto-global` + `@ceo`) e wait timer opcional.

### 3. Pipelines GitHub Actions (novos + refactor dos existentes)
Reusar `ci-shared.yml`. Criar:

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci-feature.yml` | PR para `develop` | typecheck, eslint, `bun test`, conformance packs, SDK validator, health-check dry-run, build |
| `ci-develop.yml` | push `develop` | full CI + deploy Preview (Vercel) + smoke test |
| `release-validation.yml` | PR `develop→release` e push `release` | full CI + migration dry-run (staging Supabase) + deploy Staging + e2e básico |
| `production-deploy.yml` | push `main` (manual approve via env `production`) | build + apply Supabase migrations (prod) + deploy Vercel prod + post-deploy health check + tag semver |
| `rollback.yml` | `workflow_dispatch` | inputs: `target` (app/edge/pack), `version/sha`; executa rollback correspondente |

Todos os jobs herdam gates de release do `docs/governance/release-process.md` (Conformance Suite, Validator, Health Check).

### 4. Vercel (3 ambientes)
- Configurar projeto Vercel com env mapping: Preview (branch = PR), Staging (branch = `release`), Production (branch = `main`).
- Env vars por ambiente apontando para Supabase correspondente.
- Documentar em `docs/governance/deploy-vercel.md` (setup, promoção manual, aliases).

### 5. Supabase (dual project)
- Dois projetos: `uboard-staging` e `uboard-prod`. Nunca compartilhar DB.
- Migrations versionadas em `supabase/migrations/` já existentes; pipeline aplica via `supabase db push` com service role do ambiente.
- Política: toda migration passa por staging antes de prod; rollback via migration reversa ou snapshot (documentada em `docs/governance/migration-policy.md` — estender).

### 6. Secrets centralizados no GitHub
Migrar/definir como GitHub Environment Secrets (nada em código, nada na Lovable Cloud fora do runtime necessário):
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_PROJECT_REF_PROD`
- `SUPABASE_SERVICE_ROLE_STAGING`, `SUPABASE_SERVICE_ROLE_PROD`
- `SUPABASE_DB_URL_STAGING`, `SUPABASE_DB_URL_PROD`
- `JWT_SECRET_STAGING`, `JWT_SECRET_PROD`
- `PACK_SIGNING_KEY_*` (chaves futuras dos Country Packs)
- Convenção: sufixo `_STAGING`/`_PROD`; nunca prefixo cruzado entre envs.
- Documentar em `docs/governance/secrets-inventory.md` com owner, rotação (90d), escopo.

### 7. Rollback controlado
Runbook `docs/governance/rollback-playbook.md` cobrindo:
- **App (Vercel):** promover deploy anterior via `vercel rollback` (workflow `rollback.yml` target=app).
- **Edge Functions:** redeploy da tag anterior (`supabase functions deploy --project-ref ... --version <sha>`).
- **Country Pack:** revert do commit do pack + bump `manifest.version` patch + re-release; runtime marca pack `incompatible` se health falhar (mecânica já existe).
- **DB migration:** migration reversa dedicada; snapshot restore como último recurso.
- **Auto-block:** qualquer job falho em `release-validation` ou `production-deploy` bloqueia progression (já default do Actions); adicionar `if: failure()` step que abre issue automática.

### 8. Documentação de governança (H9)
Novos docs em `docs/governance/`:
- `branch-protection.md` — regras GitFlow.
- `environments.md` — matriz env × secrets × reviewers.
- `deploy-vercel.md`
- `secrets-inventory.md`
- `rollback-playbook.md`
- Estender `release-process.md` para referenciar novos workflows.
- ADR-0009 `production-pipeline.md` — decisão arquitetural do modelo GitFlow + dual-Supabase.

## Fora de escopo (não neste sprint)
- Terraform/IaC para provisionar GitHub/Vercel/Supabase (proposta futura H10-IaC).
- Testes E2E completos (apenas smoke). Suite E2E fica para sprint dedicada.
- Observability stack externa (Datadog/Sentry) — separada.
- Multi-region Supabase / read replicas.

## Métricas de sucesso
- 0 commits diretos em `main`/`release`/`develop` após rollout.
- 100% deploys prod passam por staging.
- Rollback app < 5 min; rollback pack < 15 min.
- 0 secrets em código ou em Lovable runtime fora do necessário à app.
- Todos os 4 pipelines verdes num PR de referência.

## Detalhes técnicos

**Estrutura de arquivos criados:**
```text
.github/
  workflows/
    ci-feature.yml
    ci-develop.yml
    release-validation.yml
    production-deploy.yml
    rollback.yml
    (mantém: ci-shared.yml, ci-core.yml, ci-sdk.yml, ci-packs.yml, ci-docs.yml)
  environments/
    preview.md
    staging.md
    production.md
docs/
  governance/
    branch-protection.md
    environments.md
    deploy-vercel.md
    secrets-inventory.md
    rollback-playbook.md
    ADR-0009-production-pipeline.md
```

**Fluxo alvo (long-term, multi-CTO):**
```text
feature/{id,ph,my}/* --PR--> develop --auto--> Preview+Staging validation
                                  │
                                  ▼
                              release  --homologação--> Staging deploy
                                  │
                                  ▼
                                main  --approval--> Production deploy
                                  │
                              (rollback.yml disponível a qualquer momento)
```

**Ordem de execução do sprint:**
1. Docs de governança + ADR-0009 (base contratual).
2. `secrets-inventory.md` + configuração manual dos secrets no GitHub (ação do usuário).
3. Workflows `ci-feature` e `ci-develop`.
4. Vercel setup + `deploy-vercel.md`.
5. `release-validation` + Supabase staging wiring.
6. `production-deploy` + environment `production` com reviewers.
7. `rollback.yml` + playbook.
8. Ativação das branch protection rules (ação do usuário no GitHub UI).

**Ações manuais requeridas do usuário (fora do repo):**
- Criar projeto Supabase staging separado; fornecer refs/keys.
- Conectar repo à Vercel e criar tokens.
- Configurar branch protection e environments no GitHub UI conforme docs.
- Preencher secrets nos GitHub Environments.
