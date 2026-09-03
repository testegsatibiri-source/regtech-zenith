# Acesso por convite + Resend — Fase 2 (auditoria de schema) e plano completo

Auditoria executada em modo leitura no banco. Nenhuma migration, nenhum envio, nenhum secret consultado.

## Fase 2 — Relatório read-only do schema real

### `platform_invitations` (existe, órfã, 0 linhas)

Colunas: `id`, `email`, `role` (`app_role`), `country_code`, `invited_by` (FK `auth.users`, ON DELETE CASCADE), `token`, `accepted_at`, `expires_at` (default `now() + 7 days`), `created_at`, `updated_at`.
Constraints: PK `id`, UNIQUE `token`, FK `invited_by`. Índices: PK, unique token, `platform_invitations_email_idx`. Trigger: `updated_at`.
RLS: habilitada, **uma única policy** — `platform_admin manages invitations`, `FOR ALL TO authenticated USING/WITH CHECK is_platform_admin()`.

**Colisões com o modelo desejado:**
1. **Não tem organização/tenant.** Só `country_code`. O convite é de papel de plataforma, não de membro de empresa.
2. **`token` em texto puro e único.** O desenho pedido exige hash seguro; um `UNIQUE(token)` em claro guarda o segredo no banco.
3. **Sem coluna de estado.** Só existe `accepted_at`; não há `pending/accepted/expired/revoked`, nem `revoked_at`, nem `accepted_by`.
4. **Sem chave de idempotência** e sem índice único parcial que impeça dois convites ativos para o mesmo (org, e-mail).
5. **Sem contador/limite de reenvio.**
6. **Sem policy de leitura para o convidado** — o aceite terá de ser feito exclusivamente por server function privilegiada (o que é aceitável e até desejável), mas precisa ser decisão explícita.
7. `invited_by` é `NOT NULL` com `ON DELETE CASCADE`: apagar o convidador apaga o histórico de convites. Para auditoria, `ON DELETE SET NULL` + nullable é o correto.

### Organizações / vínculos / papéis

- **Não existe nenhuma tabela de membership, organization ou tenant** (busca por `%member%`, `%organiz%`, `%tenant%` retornou vazio).
- O tenant de fato é `companies`, com **um único `owner_id`** (FK `auth.users`). Toda a RLS de negócio deriva daí: `owns_company(_company_id)` = `companies.owner_id = auth.uid()`, usada por `employees`, `payroll_runs`, `leave_*`, `statutory_filings`, etc.
- **Consequência estrutural:** hoje uma empresa tem exatamente um usuário com acesso. Não existe "convidar um colega para a minha empresa" — não há onde registrar o vínculo. Convite multi-usuário exige uma tabela de membership nova **e** revisão de `owns_company()`, que é o predicado de dezenas de policies.
- `user_roles` (`app_role`: admin, manager, viewer, auditor, platform_admin, country_cto, platform_operator, platform_auditor) é **global, não por empresa**. RLS: só `SELECT` do próprio (`auth.uid() = user_id`); INSERT/UPDATE/DELETE negados via Data API — mutação só por service role.
- `country_cto_scopes` escopa `country_cto` por país. `role_capabilities` mapeia papel → capability (`global`/`country`), lido por `has_capability()`.
- `profiles`: `id` (FK auth.users), `display_name`, `email`. Policy `FOR ALL USING auth.uid() = id`.

### Achado crítico de segurança (bloqueia "somente por convite")

`public.handle_new_user()` — trigger `on_auth_user_created` em `auth.users` — executa:

```sql
INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
```

**Todo usuário que se cadastrar recebe o papel `admin` automaticamente.** Confirmado nos dados: 4 usuários em `auth.users`, 4 linhas em `user_roles`, todas com role `admin`. Com o formulário público de signUp ativo em `/auth`, qualquer pessoa que se cadastre vira admin. Isto precisa ser desfeito na mesma etapa em que o autocadastro for fechado — é a lacuna mais urgente de todo o plano.

### Outro achado

Todas as tabelas verificadas têm RLS ativa, mas o grant de tabela para `anon` é amplo (`arwdDxtm`). Não há exposição direta porque nenhuma policy concede a `anon`, mas o correto é revogar os grants de `anon` nas tabelas que não têm nenhuma policy `TO anon`. Hardening, não incidente.

### Estado atual dos dados
`platform_invitations`: 0 linhas · `companies`: 3 · `profiles`: 4 · `user_roles`: 4 (todas `admin`) · `auth.users`: 4.

## Decisão de arquitetura que a auditoria força

Antes de qualquer migration, é preciso escolher o eixo do convite, porque hoje eles não coexistem:

- **(A) Convite de plataforma** (papéis `platform_*`, `country_cto`): `platform_invitations` serve com ajustes moderados (hash, estado, idempotência). Não resolve multi-usuário por empresa.
- **(B) Convite de organização** (membros de uma `company`): exige tabela `company_members` nova, `platform_invitations` estendida com `company_id` **ou** uma tabela `company_invitations` separada, e substituição de `owns_company()` por um predicado de membership — mudança que toca a RLS de praticamente todas as tabelas de negócio.
- **(C) Ambos**, em duas ondas: A primeiro (baixo risco), B depois (alto risco, migração de RLS).

Recomendação: **(C)**, nesta ordem. B é uma refatoração de autorização, não um recurso de e-mail, e merece sprint própria com testes de acesso cruzado.

## Plano por fases (consolidado)

### Fase 0 — Incidente de teste
Revogar a conta cujo token vazou (Auth → Users → delete), sign-out global, confirmar Site URL de produção, redirect `/dashboard`, wildcard de preview e ausência de URL de auth em `localhost` (já verificado no código: `emailRedirectTo` é derivado de `window.location.origin`, sem hardcode). Criar usuário novo para testes.
Gate: nenhum token exposto permanece renovável.

### Fase 1 — RBAC formal
Aprovar a matriz de papéis e responder: convite vale para plataforma, para organização ou ambos; usuário pertence a uma ou várias empresas; duração e limite de reenvio; política de suspensão/reativação. Gate obrigatório antes de migrations.

### Fase 2 — Auditoria de schema
**Concluída acima.**

### Fase 3 — Fechar o autocadastro (prioridade máxima)
1. Migration: `handle_new_user()` deixa de atribuir `admin`. Primeiro usuário/bootstrap de admin passa a ser um passo deliberado.
2. Backfill deliberado dos papéis reais dos 4 usuários existentes (`run_sql`, não migration).
3. `supabase--configure_auth` com `disable_signup: true`.
4. Remover a aba "Sign up" de `src/routes/auth.tsx`, manter login e adicionar "Esqueci minha senha".
Gate: cadastro público impossível; nenhum papel concedido automaticamente.

### Fase 4 — Modelo de convite (migration)
Onda A, sobre `platform_invitations`: `token_hash` (SHA-256) substituindo `token` em claro, `status` (`pending|accepted|expired|revoked`), `revoked_at`, `accepted_by`, `resend_count`, `last_sent_at`, `idempotency_key`, índice único parcial em `(lower(email), role, coalesce(country_code,''))` onde `status='pending'`, `invited_by` nullable com `ON DELETE SET NULL`, GRANTs explícitos, policies revistas (admin gerencia; aceite via server function). Onda B (`company_members` + convite por organização) fica para depois do gate da Fase 1.

### Fase 5 — Resend para Auth (staging primeiro)
Subdomínio dedicado, verificação no Resend (SPF/DKIM/DMARC), chave exclusiva de staging, Supabase Auth → Custom SMTP, personalização dos 5 templates. **Não** habilitar Auth Hook para os mesmos eventos. Gate: entrega confirmada, links corretos, nenhum token em log.

### Fase 6 — Envio do convite
`src/lib/invitations.functions.ts` com `requireSupabaseAuth`: valida sessão, autoriza via `permissionService`/`has_capability` (nunca papel vindo do browser), normaliza e-mail, checa duplicidade, grava convite com hash, dispara o e-mail e registra em `platform_audit_log` sem token nem link.
Usuário inexistente → `inviteUserByEmail` via `supabaseAdmin` importado **dentro** do handler. Usuário já confirmado → convite próprio + notificação transacional via Resend API (o convite administrativo do Supabase falha para e-mail já confirmado).

### Fase 7 — Aceite
Rota pública `/invite/accept` + server function pública que valida hash, estado e expiração, exige e-mail autenticado igual ao do convite, revalida papel/organização no servidor, cria o vínculo e marca aceite **numa única transação idempotente** (RPC `SECURITY DEFINER` é o caminho correto aqui), audita e redireciona.

### Fase 8 — Recuperação de senha
`resetPasswordForEmail` com `redirectTo: origin + "/reset-password"`, rota pública `/reset-password` que detecta `type=recovery` e chama `updateUser({ password })` sem `current_password`. Mensagem genérica sempre. Encerrar demais sessões conforme política.

### Fase 9 — Sessões e revogação
`getUser()` no servidor para toda decisão sensível; RLS nega imediatamente após revogação do vínculo (não depender do JWT expirar); logout global disponível.

### Fase 10 — RLS
Nenhuma policy `TO authenticated` sem predicado de propriedade; autorização nunca em `user_metadata`; `service_role` jamais no frontend. Revogar grants de `anon` nas tabelas sem policy `TO anon`.

### Fase 11 — Reenvio e expiração
`supabase.auth.resend` para confirmação, cooldown, limite por e-mail/IP, resposta genérica, invalidação lógica do convite anterior, expiração automática, revogação pelo admin.

### Fase 12 — Auditoria
Eventos de convite, login/logout relevantes, reset de senha, mudança de papel, suspensão/reativação em `platform_audit_log`. Proibido registrar senha, API key, tokens, magic link, token completo de convite ou corpo do e-mail.

### Fase 13 — Testes
Positivos e negativos conforme a lista aprovada. Gate: zero acesso cruzado entre empresas, zero vínculo criado sem convite válido, aceite duplo não gera segundo vínculo.

### Fase 14 — Implantação
Homologar em staging (migrations aplicadas deliberadamente — o dry-run atual não aplica), SMTP de staging, testes completos, criar Supabase de produção, domínio e SMTP de produção, migrations, publicação com rollback preparado, monitorar bounces e abuso.

## Sobre conectores

O Resend está disponível como conector de workspace: em vez de gerenciar `RESEND_API_KEY` manualmente, a chamada pode ir pelo gateway (`Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $RESEND_API_KEY`), sempre em código server-side. Isso agiliza os **e-mails transacionais da aplicação**.
Não ajuda no SMTP do Supabase Auth: ali a credencial é digitada no painel do Supabase, fora do alcance de conectores. Ou seja: conector para a Fase 6, painel manual para a Fase 5.

## Variáveis necessárias (somente nomes)

| Nome | Onde |
|---|---|
| `RESEND_SMTP_USER` / `RESEND_SMTP_PASSWORD` | Supabase → Auth → SMTP (staging e prod, chaves distintas) |
| `RESEND_API_KEY` | Vercel Preview e Production (server-only) ou via conector Resend |
| `RESEND_FROM_EMAIL` | Vercel Preview e Production |
| `APP_PUBLIC_URL` | Vercel Preview e Production (montar links de convite no servidor) |

## Próxima ação proposta

Executar a **Fase 3** — fechar o autocadastro e remover a atribuição automática de `admin`. É a única correção de segurança ativa hoje e não depende do Resend, do domínio nem da decisão A/B/C.
