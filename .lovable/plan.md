# Auditoria somente leitura — ambientes, sincronização e promoção (regtech-zenith)

Nenhum arquivo, banco, Auth, secret, workflow ou configuração foi alterado. Nenhuma migration, `db push`, `vercel pull/build/deploy`, commit ou push foi executado. Nenhum valor de chave, token ou senha foi consultado ou exibido.

Legenda: **[C]** confirmado por leitura direta · **[I]** inferido de evidência indireta · **[NA]** não acessível deste ambiente.

**Limite de alcance, declarado de saída:** as ferramentas de banco deste editor estão vinculadas **exclusivamente** ao projeto `vavcyfcmkvimxxwpkuck`. O projeto `lyjxnceaoaivnantwmni`, a conta Vercel, os GitHub Environments e os valores de secrets **não são legíveis daqui**. Tudo que depende deles está marcado **[NA]** e não foi inferido além do que os arquivos do repositório sustentam.

---

## 1. Mapa dos ambientes

| Ambiente | Finalidade | Ref/ID público | Branch | Origem do código | Origem das migrations | Quem aplica | Dados reais? | Status |
|---|---|---|---|---|---|---|---|---|
| Lovable Preview/Sandbox | Desenvolvimento e edição assistida | projeto Lovable `46ec53e1-…` | `main` (git interno do Lovable) | Editor Lovable | Ferramenta de migration do Lovable | Lovable, com aprovação do usuário | Não — dados de teste | **[C]** |
| Supabase sandbox | Banco do ambiente Lovable | `vavcyfcmkvimxxwpkuck` | — | — | Ferramenta do Lovable, aplicação imediata | Lovable | Não (4 usuários de teste, 3 empresas) | **[C]** |
| GitHub `main` | Fonte versionada | `testegsatibiri-source/regtech-zenith` | `main` | Espelho do git do Lovable | `supabase/migrations/` (30 arquivos) | Sincronização do Lovable + PRs | n/a | **[I]** |
| Supabase commercial staging | Banco de homologação usado pela Vercel | `lyjxnceaoaivnantwmni` (informado pelo responsável) | associado a `release` | — | `supabase db push` do workflow | GitHub Actions (`release-validation.yml`) | Possivelmente | **[I]** |
| Vercel Preview/Staging | Deploy de homologação | **[NA]** | `release` (e `develop` p/ Preview) | GitHub | — | GitHub Actions + integração Git da Vercel | Depende do Supabase apontado | **[I]** |
| Supabase produção | Banco comercial | `uboard-prod` (nome documentado, ref em `SUPABASE_PROJECT_REF_PROD`) | `main` | — | `supabase db push` real | `production-deploy.yml` | Sim | **[I]** |
| Vercel Production | App público | **[NA]** | `main` | GitHub | — | `production-deploy.yml` | Sim | **[I]** |

Observação importante: a documentação do repositório (`docs/governance/environments.md`) descreve o **estado-alvo**, não necessariamente o estado atual. Ela associa `main → produção` e `release → staging`, mas **não existem branches `develop` nem `release` visíveis** neste clone — só `main` **[C]**. Se elas não existirem no GitHub, `release-validation.yml` e `production-deploy.yml` nunca disparam por push, apenas por `workflow_dispatch` **[I]**.

---

## 2. Lovable como sandbox

| Pergunta | Resposta | Status |
|---|---|---|
| Supabase conectado às ferramentas do Lovable | `vavcyfcmkvimxxwpkuck` | **[C]** |
| `project_id` em `supabase/config.toml` | `vavcyfcmkvimxxwpkuck` — arquivo tem uma única linha | **[C]** |
| Migrations do Lovable são aplicadas automaticamente nesse banco? | Sim, após aprovação do usuário, direto no sandbox. As 30 do repositório constam em `supabase_migrations.schema_migrations` | **[C]** |
| Código é sincronizado com o GitHub automaticamente? | Sim — o `origin` local é o git privado do Lovable (`git.private.lovable-gcp…/46ec53e1-…`), espelhado para o GitHub | **[C]** git remoto / **[I]** o espelhamento |
| Direção da sincronização | Lovable → GitHub (push do editor). O caminho inverso existe pela integração, mas não é observável daqui | **[I]** |
| Branch de destino | `main` | **[C]** |
| O hash criado no Lovable é preservado no GitHub? | O commit é criado aqui e empurrado; o espelho preserva o SHA quando é fast-forward. Não verificável deste ambiente | **[I]** |
| O Lovable tem acesso ao Supabase comercial ou à Vercel comercial? | **Não.** Nenhuma credencial de `lyjxnceaoaivnantwmni`, de produção ou da Vercel está disponível aqui; `.env` aponta somente para o sandbox e `config.toml` idem | **[C]** |
| Ações restritas ao sandbox | Migrations, alterações de Auth (`disable_signup`), leitura/escrita de dados, secrets do backend, storage. **Nada disso atinge staging ou produção** | **[C]** |

Consequência estrutural: **toda alteração de banco feita pelo Lovable vale apenas para o sandbox.** Para chegar ao comercial, o arquivo de migration precisa viajar pelo GitHub e ser aplicado por um workflow.

---

## 3. GitHub como fonte da verdade

**Workflows** (10) **[C]**: `ci-shared.yml` (reutilizável), `ci-core.yml`, `ci-develop.yml`, `ci-docs.yml`, `ci-feature.yml`, `ci-packs.yml`, `ci-sdk.yml`, `release-validation.yml`, `production-deploy.yml`, `rollback.yml`.

| Workflow | Trigger | Environment | Jobs | Muta recurso externo? |
|---|---|---|---|---|
| `ci-shared` | `workflow_call` | — | install, checagem de versão do tsgo, `tsgo --noEmit`, `bun test` | Não — só valida |
| `ci-develop` | push `develop`, dispatch | `preview` | validate → preflight → deploy-preview | **Sim** — `vercel build` + `vercel deploy` |
| `release-validation` | PR/push `release`, dispatch | `staging` | full-ci; preflight-supabase; preflight-vercel; migration-dry-run; deploy-staging; auto-issue | **Sim** — deploy Vercel; migration **apenas dry-run** |
| `production-deploy` | push `main`, dispatch (exige `confirm_production: PRODUCTION`) | `production` | full-ci; preflight; deploy-production; auto-issue | **Sim** — `supabase db push` **real** + deploy prod + tag git |
| `rollback` | dispatch | `staging`/`production` | rollback | Parcial — só `vercel rollback` funciona |

**Dependências entre jobs [C]:**
- `release-validation`: `migration-dry-run` depende de `full-ci` + `preflight-supabase`; `deploy-staging` depende de `migration-dry-run` + `preflight-vercel`.
- `production-deploy`: `deploy-production` depende de `full-ci` + `preflight`; dentro dele a ordem é migrations → build → deploy → health check → tag.

**Staging usa somente `--dry-run`? SIM [C]** — `release-validation.yml` linha 114: `supabase db push --db-url "$DB_URL" --dry-run`. Isso **lista** migrations pendentes; **não aplica nada**.

**Onde existe `db push` real? Apenas em `production-deploy.yml` [C]** (linha 110, sem `--dry-run`), contra `SUPABASE_PROJECT_REF_PROD`.

**Produção tem aprovação manual? [C] sim, por duas vias:** o job usa `environment: production`, e `.github/environments/production.md` exige `@cto-global` + `@ceo` com espera de 5 min. Se essas regras estiverem realmente configuradas no GitHub é **[NA]** — o arquivo markdown documenta, não configura.

**Secrets referenciados (só nomes) [C]:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_PROJECT_REF_PROD`, `SUPABASE_DB_PASSWORD_STAGING`, `SUPABASE_DB_PASSWORD_PROD`, `SUPABASE_SERVICE_ROLE_STAGING`, `SUPABASE_SERVICE_ROLE_PROD`, `JWT_SECRET_STAGING`, `JWT_SECRET_PROD`, `PACK_SIGNING_KEY_STAGING`, `PACK_SIGNING_KEY_PROD`, `LOVABLE_API_KEY_STAGING`, `LOVABLE_API_KEY_PROD`. Nenhum valor lido.

**Branch/commit realmente implantado:** **[NA]** — depende do histórico de execuções no GitHub Actions e de deployments na Vercel, ilegíveis daqui.

**Ponto de atenção [C]:** os três `preflight` são desenhados para **pular** o deploy silenciosamente quando os secrets faltam, marcando o run como verde. Um workflow verde, portanto, **não prova** que houve deploy ou aplicação de schema.

---

## 4. Supabase

| Item | Evidência | Status |
|---|---|---|
| Migrations locais versionadas | 30 arquivos em `supabase/migrations/`, de `20260712030959` a `20260903155918` | **[C]** |
| Migrations aplicadas no sandbox | 30 registros em `supabase_migrations.schema_migrations`, de `20260712031001` a `20260903155918` | **[C]** |
| Pendentes no commercial staging | Depende do `--dry-run` do workflow contra `lyjxnceaoaivnantwmni` | **[NA]** |
| Migrations de produção | Sem evidência de que `production-deploy.yml` já tenha rodado | **[NA]** |
| Auth por ambiente | Sandbox: `disable_signup=true`, `mailer_autoconfirm=false`, `anonymous_users=false`, e-mail + Google. Staging/prod desconhecidos | **[C]** sandbox / **[NA]** demais |
| `handle_new_user` | No sandbox: cria só `profiles`, **sem** conceder papel. Versionada em `20260903154807` | **[C]** sandbox / **[NA]** comercial |
| `platform_invitations` | No sandbox: `token_hash NOT NULL`, `status`, `revoked_at/by`, `accepted_by`, `resend_count`, `last_sent_at`, `idempotency_key`; coluna `token` inexistente; 0 linhas | **[C]** sandbox / **[NA]** comercial |
| RLS/grants/funções | `platform_invitations`: RLS ativa, uma policy (`is_platform_admin()`), ACL para `postgres`/`authenticated`/`service_role`, **sem `anon`**. Funções `has_role`, `has_capability`, `is_platform_admin`, `owns_company` etc. `SECURITY DEFINER` como projetado | **[C]** sandbox |

### Drift encontrado no histórico de migrations **[C]**

Os dois primeiros registros do sandbox são `20260712031001` e `20260712031025`; os dois primeiros arquivos do repositório são `20260712030959` e `20260712031023`. **As chaves de versão diferem** (defasagem de ~2 segundos), embora a contagem coincida em 30.

Efeito prático: o histórico do sandbox e o do repositório **não são idênticos por chave**. Num banco comercial vazio isso é inofensivo — as 30 do repositório serão aplicadas na ordem. No sandbox, porém, um `db push` a partir do repositório consideraria esses dois arquivos "pendentes" e tentaria reaplicá-los. Reforça a regra de nunca apontar o CLI para o sandbox.

---

## 5. Vercel

| Item | Resposta | Status |
|---|---|---|
| Project ID e proprietário | Em `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID` (GitHub Environment Secrets) | **[NA]** |
| Repositório Git conectado | Documentado como o mesmo repo; não verificável daqui | **[I]** |
| Branch de Production | `main`, conforme `production-deploy.yml` e `deploy-vercel.md` | **[C]** no código / **[NA]** no painel |
| Como o Preview é criado | Duas vias: integração Git da Vercel por PR **e** `ci-develop.yml` rodando `vercel deploy` | **[I]** a primeira, **[C]** a segunda |
| Integração Git cria deployments automaticamente? | `deploy-vercel.md` afirma que sim para PRs e pede que o deploy automático de produção a partir de `main` seja **desligado** manualmente. Se foi desligado é desconhecido | **[I]** / **[NA]** |
| O workflow também executa `vercel deploy`? | Sim, nos três workflows de deploy | **[C]** |
| Deployments duplicados para o mesmo commit? | **Provável** enquanto a integração Git estiver ativa junto com os workflows — o mesmo commit gera um deploy da Vercel e outro do Actions. Não verificável daqui | **[I]** |
| Domínio de Production | `app.uboard.app` (declarado em `production-deploy.yml`) | **[C]** no código |
| URL/domínio de staging | `staging.uboard.app` (alias definido em `release-validation.yml`) | **[C]** no código |
| Supabase usado em Preview e Production | Tabela em `deploy-vercel.md`: Preview e Staging → ref de staging; Production → ref de prod. Valores reais nas variáveis da Vercel | **[I]** / **[NA]** |
| O workflow de staging atribui alias de produção? | **NÃO.** `vercel alias set "$URL" staging.uboard.app` — alias de staging, nunca `app.uboard.app`. E o deploy de staging **não** usa `--prod` | **[C]** |

**Sobre o ponto crítico (mistura Preview/Staging × Production), a leitura do código é tranquilizadora [C]:**
- `deploy-staging` usa `vercel pull --environment=preview` e `vercel deploy --prebuilt` (sem `--prod`) → não toca produção.
- `deploy-production` usa `--environment=production`, `vercel build --prod` e `vercel deploy --prebuilt --prod`.
- Cada job declara `environment:` distinto, logo lê o conjunto de secrets daquele ambiente.

**Porém há duas ressalvas reais:**
1. `staging.uboard.app` é um **alias sobre um deployment de Preview**. Preview e Staging compartilham o mesmo escopo de variáveis na Vercel (`--environment=preview` nos dois). Isso significa que **PRs efêmeros e o staging homologado leem exatamente as mesmas variáveis**, incluindo qual Supabase é usado. Se `SUPABASE_SERVICE_ROLE_KEY` estiver preenchida no escopo Preview — e `deploy-vercel.md` manda deixá-la **unset** em Preview — qualquer PR passa a ter credencial privilegiada de staging.
2. O domínio informado como público hoje é `regtech-zenith.vercel.app`, que não é `staging.uboard.app` nem `app.uboard.app`. Ou seja, o app público atual **não** corresponde ao mapa de domínios documentado **[I]**.

---

## 6. Fluxo completo de promoção

```text
Lovable ──①──> GitHub main ──②──> CI (ci-shared) ──③──> [release] dry-run
                                          │                      │
                                          │                      ④ deploy staging (alias staging.uboard.app)
                                          │
                                          └──⑤──> [main] db push REAL ──⑥──> build/deploy prod ──⑦──> app.uboard.app
```

| Seta | Automática/Manual | Leitura/Mutação | Credencial (nome) | Gate | Rollback | Evidência |
|---|---|---|---|---|---|---|
| ① Lovable → GitHub | Automática no salvamento | Mutação (código) | token interno do Lovable | Aprovação do usuário no editor | `git revert` | `git remote -v` **[C]** |
| ② GitHub → CI | Automática por push/PR | Leitura | `GITHUB_TOKEN` (read) | — | n/a | `ci-shared.yml` **[C]** |
| ③ CI → dry-run staging | Automática em `release` | **Leitura** (`--dry-run`) | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_DB_PASSWORD_STAGING` | `preflight-supabase` (pula se faltar secret) | n/a — nada é aplicado | `release-validation.yml:114` **[C]** |
| ④ CI → deploy staging | Automática | Mutação (Vercel) | `VERCEL_*` | `preflight-vercel` + sucesso do dry-run | `vercel rollback` | `release-validation.yml:120-154` **[C]** |
| ⑤ main → migrations prod | Automática após aprovação do environment | **Mutação de schema** | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_PROD`, `SUPABASE_DB_PASSWORD_PROD` | `environment: production` (reviewers + 5 min, se configurados) | **Inexistente na prática** | `production-deploy.yml:97-113` **[C]** |
| ⑥ Build/deploy prod | Automática | Mutação | `VERCEL_TOKEN` | health check `/api/public/v1/health` pós-deploy | `vercel rollback` | `production-deploy.yml:116-139` **[C]** |
| ⑦ Alias/domínio | Automática (`--prod`) | Mutação | `VERCEL_TOKEN` | — | rollback do deployment | **[C]** |

**Lacuna estrutural do fluxo [C]:** não existe passo de **aplicação real** em staging. Staging só faz `--dry-run`; a primeira aplicação real do schema acontece **direto em produção**. Ou seja, migrations nunca são exercitadas contra um banco real antes de tocarem o banco comercial — o oposto do que "homologação" deveria significar.

**Rollback [C]:** `rollback.yml` implementa de verdade apenas `target: app` (`vercel rollback`). Para `pack` e `migration` o job imprime uma mensagem e faz `exit 1`. **Não há rollback de migration.**

---

## 7. Mudanças já realizadas

| Migration | Sandbox | Repositório | Commercial staging | Produção | Commit |
|---|---|---|---|---|---|
| `20260903154807` (handle_new_user sem papel) | **Aplicada [C]** | Versionada **[C]** | **Não aplicada** — staging só faz dry-run **[C/I]** | **Não** — sem evidência de execução do workflow de produção **[I]** | `1036239` |
| `20260903155918` (modelo de convite) | **Aplicada [C]** | Versionada **[C]** | **Não aplicada [C/I]** | **Não [I]** | `f6c9700` |

**Banco à frente do Git? Sim, temporariamente [C].** Em ambos os casos a migration foi aplicada no sandbox **antes** do commit. A janela foi curta e hoje repositório e sandbox estão consistentes (30/30, ressalvado o drift de chave da seção 4). Registrado como desvio de processo.

**Impacto no ambiente público: nenhum [I].** As duas migrations vivem apenas no sandbox. O banco que o site público usa não foi alterado por elas.

**Status do código:**

| Item | Estado | Onde vale |
|---|---|---|
| Remoção do signup (UI) | Implementado — `src/routes/auth.tsx` sem aba "Sign up", sem `supabase.auth.signUp` | Todo ambiente que rode este commit **[C]** |
| `disable_signup` (Auth) | `true` **apenas no sandbox** | Sandbox **[C]**; staging/prod **[NA]** |
| Recuperação de senha | Implementada (`/reset-password`), **não homologada** — nenhum teste real de e-mail | Código em todo ambiente **[C]** |
| `handle_new_user` | Sem concessão de papel | **Só no sandbox** **[C]** |
| `platform_invitations` | Modelo com hash, status e idempotência | **Só no sandbox** **[C]** |

**Assimetria a destacar:** o código de UI viaja pelo Git e chega a qualquer ambiente; o schema e a configuração de Auth **não**. Hoje existe um estado possível em que o app público mostra "Access is invite-only" enquanto o banco comercial ainda concede `admin` automaticamente e aceita autocadastro. Isso não é hipótese remota — é o estado esperado até que as migrations sejam aplicadas e `disable_signup` seja configurado em cada projeto comercial.

---

## 8. Riscos e inconsistências

| # | Risco | Classificação | Evidência |
|---|---|---|---|
| 1 | **App público usa banco diferente do banco migrado.** As correções de segurança (sem `admin` automático, convite com hash) existem só no sandbox | **CRÍTICO** | Seção 7 **[C/I]** |
| 2 | **Auth divergente por ambiente.** `disable_signup=true` só no sandbox; o projeto comercial pode continuar aceitando autocadastro — e, sem a migration, concedendo `admin` a quem se cadastrar | **CRÍTICO** | `/auth/v1/settings` do sandbox **[C]**; comercial **[NA]** |
| 3 | **Nenhuma aplicação real de schema em staging.** Só dry-run; a estreia real do schema é em produção | **CRÍTICO** | `release-validation.yml:114` **[C]** |
| 4 | **Sem rollback de migration.** O job existe e falha por construção | **ALTO** | `rollback.yml` **[C]** |
| 5 | **Workflow verde sem aplicação real.** Os `preflight` pulam deploy silenciosamente quando faltam secrets, e o run fica verde | **ALTO** | Três workflows **[C]** |
| 6 | **Preview e Staging compartilham escopo de variáveis na Vercel.** Se `SUPABASE_SERVICE_ROLE_KEY` estiver no escopo Preview, todo PR ganha credencial privilegiada de staging | **ALTO** | `--environment=preview` nos dois **[C]**; conteúdo real **[NA]** |
| 7 | **Deployments duplicados por commit**, se a integração Git da Vercel continuar ativa junto com os workflows | **MÉDIO** | `deploy-vercel.md` pede desligar manualmente **[I]** |
| 8 | **Domínio público fora do mapa documentado** (`regtech-zenith.vercel.app` × `staging.uboard.app`/`app.uboard.app`) | **MÉDIO** | **[I]** |
| 9 | **Drift de chave no histórico de migrations** entre sandbox e repositório (2 versões com timestamps distintos) | **MÉDIO** | Seção 4 **[C]** |
| 10 | **Branches `develop` e `release` ausentes** neste clone; se não existirem no GitHub, os gates de staging nunca disparam por push | **MÉDIO** | `git branch -a` **[C]** |
| 11 | **Mudança de sandbox relatada como comercial.** Risco de processo: os relatórios anteriores das Fases 3/4A/8 descrevem o sandbox; nada disso vale para o comercial | **ALTO** | Este relatório **[C]** |
| 12 | **Drift entre banco, tipos gerados e código.** `src/integrations/supabase/types.ts` reflete o sandbox; contra o banco comercial atual o código tipado está à frente do schema | **MÉDIO** | `f6c9700` regenerou `types.ts` **[C]** |
| 13 | Incidente do `sub` `ece23d17…`: não existe no sandbox; provavelmente pertence a `lyjxnceaoaivnantwmni`, onde não pode ser verificado nem revogado daqui | **ALTO** | Consulta anterior **[C]** / **[NA]** |
| 14 | Sem alias de produção sendo atribuído por staging — **verificado e negativo** | **BAIXO** (risco descartado) | `release-validation.yml:151` **[C]** |
| 15 | Chaves privadas de assinatura dos packs da Indonésia nunca colocadas em custódia | **MÉDIO** | `secrets-inventory.md`, seção "Known gap" **[C]** |

---

## 9. Bloqueadores para Resend e convites

1. **Alvo indefinido.** Resend SMTP é configurado por projeto Supabase, no painel. Sem decidir se a Onda A vale para sandbox, staging ou produção — e sem acesso aos dois últimos —, a Fase 5 não tem onde ser executada. **CRÍTICO.**
2. **Schema de convite ausente no comercial.** `platform_invitations` no formato novo existe só no sandbox. Enviar convite antes de aplicar `20260903155918` no ambiente alvo falha na primeira escrita. **CRÍTICO.**
3. **Autocadastro possivelmente aberto no comercial.** Convidar enquanto qualquer pessoa pode se cadastrar (e talvez virar `admin`) esvazia o propósito do convite. **CRÍTICO.**
4. **Staging não aplica migrations.** Não há como homologar o fluxo de convite antes de produção com o pipeline atual. **ALTO.**
5. **Reset de senha não homologado** — depende de SMTP ativo. **ALTO.**
6. **Custódia do `RESEND_API_KEY`** ainda não definida (GitHub Environment × conector × variável da Vercel), e o SMTP do Supabase é digitado no painel, fora do alcance de qualquer conector. **MÉDIO.**
7. **Sem rollback de migration** — aplicar o modelo de convite em produção hoje é uma via de mão única. **ALTO.**

---

## 10. Próxima ação mínima recomendada

Uma só, barata e sem mutação: **executar o `--dry-run` de staging já existente** (`Release Validation → Staging` por `workflow_dispatch`) e ler a saída. Ela responde, sem alterar nada, à pergunta que hoje bloqueia tudo: **quantas e quais das 30 migrations o banco comercial de staging considera pendentes.** Com esse número em mãos, o gap entre sandbox e comercial deixa de ser inferência e vira fato mensurável.

Depois disso, e só depois, faz sentido decidir a ordem de: aplicar schema em staging → configurar Auth em staging → SMTP → convites.

Nada foi alterado. `roadmap.md` não foi tocado. Aguardando autorização.
