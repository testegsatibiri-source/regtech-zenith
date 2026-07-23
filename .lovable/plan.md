## Plano — H12.1: Deploy Gating por Secrets (v2, com refinamentos)

Ambos refinamentos aprovados. Mudanças vs. plano anterior:

1. **`workflow_dispatch` também passa pelo preflight por padrão.** Só é ignorado quando um input explícito `force_deploy: true` é marcado. Elimina risco de execução acidental sem credenciais.
2. **Mensagem de skip explícita e humana** — além do `::notice::`, o job downstream (via `if: false`) fica com nome descritivo no summary do GitHub Actions.

### Estratégia consolidada

Cada workflow de deploy ganha:
- `on.workflow_dispatch.inputs.force_deploy` (boolean, default `false`).
- Job `preflight` que checa presença dos secrets e emite `outputs.ready`.
- Jobs de deploy: `needs: [<ci>, preflight]` + `if: needs.preflight.outputs.ready == 'true' || github.event.inputs.force_deploy == 'true'`.
- `auto-issue-on-failure`: `if: failure() && (needs.preflight.outputs.ready == 'true' || github.event.inputs.force_deploy == 'true')` — não abre issue quando o skip é intencional.

### Padrão de preflight

```yaml
on:
  push: { branches: [develop] }
  workflow_dispatch:
    inputs:
      force_deploy:
        description: "Ignore missing secrets and try to deploy anyway"
        type: boolean
        default: false

jobs:
  preflight:
    runs-on: ubuntu-latest
    outputs:
      ready: ${{ steps.check.outputs.ready }}
    steps:
      - id: check
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          if [ -n "$VERCEL_TOKEN" ] && [ -n "$VERCEL_ORG_ID" ] && [ -n "$VERCEL_PROJECT_ID" ]; then
            echo "ready=true" >> "$GITHUB_OUTPUT"
            echo "✅ Vercel secrets configured — deployment will proceed."
          else
            echo "ready=false" >> "$GITHUB_OUTPUT"
            {
              echo "### ⏭️ Deployment skipped"
              echo ""
              echo "Deployment skipped because production infrastructure is not configured yet (missing GitHub Secrets). CI completed successfully."
              echo ""
              echo "**Missing secrets:** \`VERCEL_TOKEN\`, \`VERCEL_ORG_ID\`, and/or \`VERCEL_PROJECT_ID\`."
              echo "**To enable:** configure the secrets in the target environment (Settings → Environments) or trigger this workflow manually with \`force_deploy: true\`."
            } >> "$GITHUB_STEP_SUMMARY"
            echo "::notice title=Deploy skipped::Production infrastructure not configured (missing GitHub Secrets). CI completed successfully."
          fi
```

### Mudanças por arquivo

**`.github/workflows/ci-develop.yml`**
- `on.workflow_dispatch` com input `force_deploy`.
- Job `preflight` (checa Vercel trio).
- `deploy-preview`: `needs: [validate, preflight]` + gate.

**`.github/workflows/release-validation.yml`**
- `on.workflow_dispatch` com input `force_deploy` (mantém `pull_request` e `push` em `release`).
- Dois preflights: `preflight-supabase` (SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF_STAGING + SUPABASE_DB_PASSWORD_STAGING) e `preflight-vercel` (Vercel trio).
- `migration-dry-run`: gate no preflight-supabase; `deploy-staging`: gate em ambos.
- `auto-issue-on-failure`: só cria issue quando pelo menos um preflight passou (ou `force_deploy`).

**`.github/workflows/production-deploy.yml`**
- `on.workflow_dispatch` com dois inputs: `force_deploy` (bool) e `confirm_production` (string, deve ser `"PRODUCTION"`) — dupla trava para não disparar por engano.
- Preflight combinado (Supabase prod + Vercel).
- `deploy-production`: gate; `auto-issue-on-failure` também.

### Fora de escopo (sem mudança)

- `rollback.yml` — já é `workflow_dispatch`-only, tem seus próprios inputs.
- `ci-core.yml`, `ci-sdk.yml`, `ci-feature.yml`, `ci-packs.yml`, `ci-docs.yml`, `ci-shared.yml` — CI puro, sem secrets externos.
- Nada em `src/`, `supabase/`, `package.json`.
- **Nenhum secret novo criado.**

### Documentação

Adicionar seção "Deployment gating" em `docs/governance/deploy-vercel.md` (~15 linhas) explicando:
- Comportamento padrão (skip quando secrets ausentes).
- Como reativar (popular secrets em GitHub Environments).
- Override manual via `workflow_dispatch` + `force_deploy: true` (com aviso de que falhará se secrets ainda estiverem ausentes).

### Validação pós-mudança

1. Push em `develop` sem secrets → `validate` verde, `preflight` verde com `ready=false`, `deploy-preview` **skipped**, summary mostra mensagem humana. Nenhuma issue aberta.
2. Push em `main` sem secrets → mesmo padrão em produção.
3. `workflow_dispatch` em `ci-develop` sem marcar `force_deploy` → mesmo skip (validação do refinamento 1).
4. `workflow_dispatch` com `force_deploy: true` sem secrets → deploy tenta, falha esperada, issue de auditoria criada (comportamento intencional de debug).
5. Quando secrets forem adicionados a uma Environment: próximo push executa deploy normalmente, zero edições de YAML.
