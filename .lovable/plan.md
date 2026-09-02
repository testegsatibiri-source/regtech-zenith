# Correção: GitHub Environment em preflight jobs do release-validation.yml

## ROOT CAUSE
Os secrets de staging (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_DB_PASSWORD_STAGING`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) estão cadastrados corretamente no GitHub Environment `staging`, mas os jobs `preflight-supabase` e `preflight-vercel` não declaram `environment: staging`. Sem essa declaração, o job não consegue ler Environment Secrets e os passos de verificação produzem `ready=false`, fazendo com que `migration-dry-run` e `deploy-staging` sejam SKIPPED.

## FILES MODIFIED
- `.github/workflows/release-validation.yml`

## CHANGE
Adicionar `environment: staging` aos jobs:
- `preflight-supabase`
- `preflight-vercel`

Mantendo inalterados:
- Nomes dos secrets
- Lógica dos gates
- Job `migration-dry-run` (já possui `environment: staging`)
- Job `deploy-staging` (já possui `environment: staging`)
- Migrations

## VALIDATION
1. Validar sintaxe YAML do workflow.
2. Executar gate local: `bunx tsgo --noEmit`, `bun test`, `bunx eslint .` (0 erros tolerados, 11 warnings já aceitos).
3. Não executar `db push` ou qualquer migration manualmente.

## COMMIT
- Mensagem: `fix(ci): add staging environment to preflight jobs`

## PUSH
- Push para branch atual (`main` ou `release`, conforme contexto do repositório).

## READY TO RE-RE-RUN
Após push bem-sucedido, informar o hash do commit e aguardar execução manual do workflow "Release Validation → Staging" no GitHub Actions.
