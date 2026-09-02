# Correção do deploy-staging: vínculo Vercel e env propagation

## Diagnóstico (confirmado em modo read-only)

- `.vercel` não é versionado e não existe no working tree — o vínculo problemático é criado em runtime pelo `vercel pull` no runner.
- `.gitignore` não tem regra para `.vercel` — risco de commit acidental de `project.json` em desenvolvimento local.
- Em `deploy-staging` (release-validation.yml), `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` só existem no step `vercel pull`; `build` e `deploy` rodam sem eles e dependem do `.vercel/project.json` deixado pelo pull.
- `VERCEL_TOKEN` é passado inline (`--token=${{ secrets.VERCEL_TOKEN }}`), expondo o valor na linha de comando; o padrão correto é env + `$VERCEL_TOKEN`.
- Erro "Could not retrieve Project Settings" = a API da Vercel recusou a resolução do projeto com as credenciais do environment `staging`: token sem acesso ao projeto, ou ORG_ID/PROJECT_ID incorretos/trocados.

## Mudanças propostas

### 1. `.github/workflows/release-validation.yml` — job `deploy-staging`

Definir `env` no nível do job (vale para todos os steps):

```yaml
    env:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

E nos steps, trocar token inline por referência de env:

- `vercel pull --yes --environment=preview --token=$VERCEL_TOKEN`
- `vercel build --token=$VERCEL_TOKEN` (mantém `BUILD_TARGET: vercel` no env do step)
- `vercel deploy --prebuilt --token=$VERCEL_TOKEN` e `vercel alias set ... --token=$VERCEL_TOKEN`

### 2. `.github/workflows/production-deploy.yml` — job `deploy-production`

Mesma correção: `env` no nível do job com as três variáveis (`*_PROD` onde aplicável conforme secrets existentes) e `--token=$VERCEL_TOKEN` nos comandos.

### 3. `.gitignore`

Adicionar:

```text
# Vercel
.vercel
```

## Fora de escopo (não alterado)

- Nomes dos secrets, gates de preflight, `migration-dry-run`, migrations.
- Nenhum `vercel pull/build/deploy` executado localmente.
- Nenhuma alteração de código da aplicação.

## Ação manual necessária no GitHub (fora do código)

Verificar em Settings → Environments → staging:
- `VERCEL_PROJECT_ID` = Project ID do projeto `uboard` (Vercel Dashboard → Project → Settings → General), formato `prj_...`
- `VERCEL_ORG_ID` = Team/Org ID (Vercel Dashboard → Team Settings → General), formato `team_...`
- `VERCEL_TOKEN` criado no mesmo time/org que contém o projeto, com escopo que permita deploys.

## Validação

1. `python3 -c` parse YAML dos dois workflows.
2. `git status` limpo fora dos 3 arquivos alterados.
3. Re-run manual do "Release Validation → Staging" via `workflow_dispatch`, `force_deploy: false`, após o sync para `main`.
