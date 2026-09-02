# Hardening dos steps de migration (staging dry-run + masking + sslmode + curl fail-fast)

## ANÁLISE DAS SUGESTÕES

Estado atual vs. exigido:

| Item | Estado atual | Ação |
|---|---|---|
| staging `db push --dry-run` | push real em staging | **ALTERAR** — staging vira validação (dry-run), coerente com o nome do job `migration-dry-run` |
| produção push real só no job de produção | já é assim | manter |
| `::add-mask::` na senha URL-encoded | ausente — `PW_ENC` vai para a DB_URL sem mask; se a CLI ecoar a URL em erro, a senha vaza no log | **ADICIONAR** |
| DB_URL nunca exibida | não é ecoada hoje, mas sem mask o risco existe | garantido pelo add-mask + sem `set -x` |
| sem `set -x` | já é assim (`set -euo pipefail`) | manter |
| curl fail-fast + validação de região | `curl -sS` (não falha em HTTP 4xx/5xx); validação de região já existe | **ALTERAR** para `curl -fsS` |
| session pooler :5432 + `sslmode=require` | pooler :5432 ok; **sem sslmode** — conexão pode ir sem TLS | **ADICIONAR** `?sslmode=require` |
| nenhum db push manual | respeitado | manter |

Todas as 8 sugestões são viáveis e relevantes. Nenhuma altera secrets, gates, ordem de jobs ou migrations.

## DIFF EXATO

### 1. `.github/workflows/release-validation.yml` (step "Push migrations (staging, IPv4 pooler)")

```diff
       - name: Push migrations (staging, IPv4 pooler)
         # GitHub runners have no IPv6; the direct db host is IPv6-only.
         # Use the session pooler (IPv4) connection string instead.
         run: |
           set -euo pipefail
           REF="${{ secrets.SUPABASE_PROJECT_REF_STAGING }}"
-          REGION=$(curl -sS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
+          REGION=$(curl -fsS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
             https://api.supabase.com/v1/projects | jq -r --arg ref "$REF" '.[] | select(.id==$ref) | .region')
           if [ -z "$REGION" ] || [ "$REGION" = "null" ]; then
             echo "::error::Could not resolve region for project $REF"; exit 1
           fi
           PW_ENC=$(jq -rn --arg p "$SUPABASE_DB_PASSWORD" '$p|@uri')
-          DB_URL="postgresql://postgres.${REF}:${PW_ENC}@aws-0-${REGION}.pooler.supabase.com:5432/postgres"
-          supabase db push --db-url "$DB_URL"
+          echo "::add-mask::$PW_ENC"
+          DB_URL="postgresql://postgres.${REF}:${PW_ENC}@aws-0-${REGION}.pooler.supabase.com:5432/postgres?sslmode=require"
+          supabase db push --db-url "$DB_URL" --dry-run
```

### 2. `.github/workflows/production-deploy.yml` (step "Apply prod migrations")

```diff
       - name: Apply prod migrations
         # GitHub runners have no IPv6; use the IPv4 session pooler.
         run: |
           set -euo pipefail
           REF="${{ secrets.SUPABASE_PROJECT_REF_PROD }}"
           supabase link --project-ref "$REF"
-          REGION=$(curl -sS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
+          REGION=$(curl -fsS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
             https://api.supabase.com/v1/projects | jq -r --arg ref "$REF" '.[] | select(.id==$ref) | .region')
           if [ -z "$REGION" ] || [ "$REGION" = "null" ]; then
             echo "::error::Could not resolve region for project $REF"; exit 1
           fi
           PW_ENC=$(jq -rn --arg p "$SUPABASE_DB_PASSWORD" '$p|@uri')
-          supabase db push --db-url "postgresql://postgres.${REF}:${PW_ENC}@aws-0-${REGION}.pooler.supabase.com:5432/postgres"
+          echo "::add-mask::$PW_ENC"
+          supabase db push --db-url "postgresql://postgres.${REF}:${PW_ENC}@aws-0-${REGION}.pooler.supabase.com:5432/postgres?sslmode=require"
```

Produção permanece **push real** (sem `--dry-run`), somente no job `deploy-production`.

## NOTAS TÉCNICAS

- `supabase db push --dry-run` **lista as migrations que seriam aplicadas sem persistir alterações**. Ele valida o alinhamento do histórico remoto e a seleção das migrations, mas **não** executa o SQL de forma transacional e **não** garante que o push real passará (erros de DDL, dependências, permissões ou locks só aparecem no push real). Correção da descrição anterior, que afirmava execução em transação revertida — não é o comportamento da CLI.
- Consequência operacional: **staging deixa de ter migrations aplicadas por este job**; o job passa a ser um gate de consistência de histórico. O apply real em staging precisa de uma execução deliberada separada, se e quando você quiser. Registrado como dry-run conforme solicitado.
- `::add-mask::` faz o GitHub Actions redigir o valor em todos os logs do job, inclusive se a CLI ecoar a connection string num erro.
- `curl -fsS` falha (exit != 0) em respostas HTTP 4xx/5xx, evitando que um corpo de erro da Management API seja parseado como região.
- `sslmode=require` força TLS na conexão com o pooler.

## VALIDATION

1. Validar sintaxe YAML dos dois workflows.
2. Gate local: `bunx tsgo --noEmit`, `bun test`, `bunx eslint .` (0 erros; 11 warnings tolerados) — embora nenhum código de aplicação seja tocado.
3. **Nenhum `db push` executado durante a validação** (nem manual, nem dry-run).

## COMMIT

- Mensagem: `fix(ci): harden migration steps — staging dry-run, add-mask, sslmode, curl fail-fast`

## PUSH

- Sync automático Lovable → GitHub em `main` (`testegsatibiri-source/regtech-zenith`). Nenhuma outra branch tocada.

## READY TO RE-RUN

Após o sync em `main`, executar manualmente "Release Validation → Staging" via `workflow_dispatch` a partir de `main`, `force_deploy: false`.
