# Auditoria de Workflows — Plano de Correção (v3, com pinning e verificação)

Escopo: 10 workflows em `.github/workflows/*.yml` + `package.json`. Zero mudanças em código de aplicação, SDK, packs, banco ou docs.

## Refinamentos incorporados nesta versão

1. **Versão fixada** de `@typescript/native-preview` (não `latest`) — o pacote publica pré-releases diários (`7.0.0-dev.YYYYMMDD.N`); `latest` deixaria o CI dependente do último build.
2. **Guarda extra do `bunfig.toml`:** `minimumReleaseAge = 86400` já bloquearia versões publicadas nas últimas 24h. Isso reforça que a versão pinada precisa ter pelo menos 1 dia; escolhemos uma versão publicada há mais de 24h no momento do commit.
3. **Verificação local antes de abrir PR:** `bun install && bunx tsgo --version && bunx tsgo --noEmit` executados na sandbox para confirmar que o binário resolve pela dependência local (não tenta buscar `tsgo` no npm).
4. **Ordem canônica dos steps em cada workflow:** `checkout → setup-bun → cache → bun install --frozen-lockfile → bunx tsgo --noEmit`. Todos os workflows já seguem essa ordem — nenhuma reordenação necessária, apenas conferido durante a edição.

## Validação prévia (A1) — já feita

- `tsgo` aparece em 7 lugares (3 workflows + template de PR + 2 docs de governance + description do reusable). Convenção documentada.
- Nenhuma referência a `@typescript/native-preview` — o pacote nunca foi instalado.
- `bunx tsgo` retorna 404 porque não existe pacote chamado `tsgo` no npm; o binário `tsgo` vem de `@typescript/native-preview`.
- **Decisão:** instalar `@typescript/native-preview` com versão pinada. Não trocar por `tsc`.

## Correções

### 🔴 P0 — Bloqueantes

**A1 — Instalar tsgo com versão fixada**
- `package.json → devDependencies`: adicionar `"@typescript/native-preview": "7.0.0-dev.20260707.2"` (última versão estável na data, > 24h e portanto compatível com `minimumReleaseAge`).
- Executar `bun install` para regenerar `bun.lock`.
- Verificação obrigatória no sandbox antes de considerar o passo concluído:
  ```
  bunx tsgo --version   # deve imprimir a versão pinada, sem acesso à rede
  bunx tsgo --noEmit    # deve rodar o typecheck localmente
  ```
- Nenhuma alteração nos workflows: `bunx tsgo --noEmit` passa a resolver via `node_modules/.bin/tsgo`.

**A2 — `production-deploy.yml`: adicionar `contents: write` no job `deploy-production`**
- Step `Tag release` faz `git tag` + `git push origin`. Sem essa permissão, o push falha e dispara `auto-issue-on-failure` em todo deploy bem-sucedido.

**A3 — Jobs `auto-issue-on-failure` sem `issues: write`**
- Em `production-deploy.yml`, `release-validation.yml` e `rollback.yml` os steps chamam `github.rest.issues.create`. Adicionar `permissions: { issues: write, contents: read }` em cada job de auto-issue.
- Em `rollback.yml`, mover o step `Audit issue` para `if: always()`, para preservar rastro quando os targets `pack`/`migration` fazem `exit 1` por design.

**A4 — Remover target `edge` do `rollback.yml`**
- Não existe `supabase/functions/` (arquitetura TanStack, endpoints em `src/routes/api/*`). O choice `edge` está permanentemente quebrado.
- Ajustes no `rollback.yml`:
  - Remover `edge` de `type: choice options`.
  - Remover o step `Redeploy previous Edge Function`.
  - Ajustar condicional do `Setup Supabase CLI` para `if: github.event.inputs.target == 'migration'`.

**A5 — `codeowners-validator` sem token**
- Check `files` faz chamadas à API do GitHub — sem token, é rate-limited/proibido.
- Em `ci-docs.yml`: adicionar `permissions: { contents: read }` no job `docs` e passar `github_access_token: ${{ secrets.GITHUB_TOKEN }}` para `mszostok/codeowners-validator@v0.7.4`.

### 🟠 P1 — Higiene

**B1** — `ci-packs.yml` roda `bunx tsgo --noEmit` 3× (uma vez por shard). Remover o step `Typecheck` deste workflow — `ci-core.yml`, `ci-feature.yml` e `ci-shared.yml` já cobrem typecheck global.

**B2** — Chaves de cache referenciam `bun.lockb` (formato binário) além de `bun.lock`. Projeto usa apenas `bun.lock` (confirmado em `bunfig.toml → saveTextLockfile = true`). Remover `'bun.lockb'` de `hashFiles(...)` em `ci-shared.yml`, `ci-feature.yml`, `ci-packs.yml`.

**B3** — `URL=$(vercel deploy ...)` em `ci-develop.yml` e `production-deploy.yml`: usar `| tail -n1` para tolerar linhas extras no stdout do Vercel CLI.

### 🟡 P2 — Endurecimento padrão

**C1** — Adicionar `permissions: contents: read` no topo de cada workflow (default read-only, princípio do menor privilégio). Jobs que precisam de mais escopo (A2, A3, A5) escalam localmente. Aplicar em: `ci-core.yml`, `ci-develop.yml`, `ci-docs.yml`, `ci-feature.yml`, `ci-packs.yml`, `ci-sdk.yml`, `ci-shared.yml`, `production-deploy.yml`, `release-validation.yml`, `rollback.yml`.

## Fora de escopo (registrado, não alterado agora)

- **B4** — `release-validation.yml` usa `--environment=preview` como alias de staging: depende de Vercel Environments customizados (config org). Anotar como pendência em `docs/governance/deploy-vercel.md` **só se sobrar tempo**; senão, próxima sprint.
- **B5** — Deployment Protection em previews devolvendo 401 no smoke test: config Vercel.
- **C3** — `production-deploy.yml` sem `workflow_dispatch`: decisão de política.

## Arquivos alterados

- `package.json` (+1 devDependency pinada)
- `bun.lock` (regenerado por `bun install`)
- `.github/workflows/ci-shared.yml`
- `.github/workflows/ci-feature.yml`
- `.github/workflows/ci-packs.yml`
- `.github/workflows/ci-core.yml`
- `.github/workflows/ci-sdk.yml`
- `.github/workflows/ci-develop.yml`
- `.github/workflows/ci-docs.yml`
- `.github/workflows/release-validation.yml`
- `.github/workflows/production-deploy.yml`
- `.github/workflows/rollback.yml`

Nenhum arquivo em `src/`, `docs/`, `supabase/` alterado.

## Validação pós-mudança

1. Sandbox: `bun install --frozen-lockfile && bunx tsgo --version && bunx tsgo --noEmit` — deve passar sem erros de rede.
2. `bun test` — 37/37 continuam verdes (não mexemos em código de teste).
3. Abrir PR de teste contra `develop` → `ci-feature.yml` verde ponta a ponta.
4. Simular falha de step em `production-deploy.yml` (branch de teste) → issue de auditoria criada com labels corretos (valida A2 + A3).
5. `workflow_dispatch` de `rollback.yml` com `target=pack` em staging → `exit 1` esperado, mas issue de auditoria criada (valida A3 + A4 + `if: always()`).
