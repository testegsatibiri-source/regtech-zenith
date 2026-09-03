# HOLD — Evidências das Fases 3, 8 e 4A + desenho da Fase 6 (somente plano)

Decisão arquitetural registrada: **Opção C**.
- Onda A (agora): convites para papéis de plataforma (`platform_invitations`).
- Onda B (sprint própria, depois): `company_members`, convites de empresa e refatoração integral de `owns_company()` e da RLS derivada.

Nada de Resend, envio, aceite, RPC, migration adicional, secret, deploy ou configuração remota neste turno.

---

## 1. FASE 3 — fechamento do autocadastro

**Migration:** `supabase/migrations/20260903154807_2e697a00-bcef-4753-bae1-bf438fd07da6.sql` (timestamp `20260903154807`). Registrada no remoto em `supabase_migrations.schema_migrations`.

**Diff efetivo de `handle_new_user()`** — a linha removida era:

```sql
- INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
-   ON CONFLICT DO NOTHING;
```

Definição atual, lida do banco remoto (`pg_get_functiondef`):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  -- Papéis NUNCA são concedidos automaticamente no cadastro.
  RETURN NEW;
END; $function$
```

Trigger em `auth.users`: `on_auth_user_created -> handle_new_user` (único). Cria apenas o `profiles`.

**Confirmação remota de `disable_signup`** — `GET /auth/v1/settings`:
`"disable_signup": true`, `"mailer_autoconfirm": false`, `"external.anonymous_users": false`, `email: true`, `google: true`.

**Tentativa real de signup público** (`POST /auth/v1/signup`, chave publishable):
`HTTP 422 {"code":422,"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}` — rejeitado, nenhum usuário criado (`auth.users` continua com 4).

**`inviteUserByEmail` não receberá `admin` pelo trigger:** o único caminho automático era o `INSERT` em `user_roles` dentro de `handle_new_user()`, agora removido. Qualquer usuário criado por convite administrativo entra sem papel; a atribuição passará a ser um passo explícito no aceite (Fase 7).

**Estado atual (mascarado):** `auth.users = 4`, `profiles = 4`, `user_roles = 4`.

| id (prefixo) | e-mail | confirmado | papéis |
|---|---|---|---|
| bbb6fa16… | e***@g*** | sim | admin |
| 609ffcc2… | u***@g*** | sim | admin |
| 8a299d7c… | x***@g*** | sim | admin |
| d4162828… | t***@g*** | sim | admin |

**Conta com token exposto:** **não removida e não revogada.** As 4 contas originais continuam ativas e todas ainda com `admin` — o backfill deliberado de papéis e a Fase 0 (revogação + sign-out global) seguem em aberto. Este é o item de segurança pendente mais antigo.

---

## 2. FASE 8 — recuperação de senha

**`src/routes/auth.tsx`** — commit `1036239`: removidos `Tabs`, o estado `name` e toda a função `signUp` (que chamava `supabase.auth.signUp` com `emailRedirectTo: origin + "/dashboard"`). Entrou o modo `"signin" | "forgot"`, o botão "Forgot your password?", a nota "Access is invite-only" e o `head()` de SEO. `signInWithPassword` e o OAuth Google permanecem inalterados.

Nova função:

```ts
await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
  redirectTo: window.location.origin + "/reset-password",
});
toast.success("If that address has an account, a reset link is on its way.");
```

**Rota `/reset-password`** (`src/routes/reset-password.tsx`, `ssr: false`): valida o link, oferece nova senha + confirmação (mínimo 8 caracteres, igualdade obrigatória), chama `supabase.auth.updateUser({ password })` sem senha atual, e em seguida `signOut({ scope: "global" })` antes de voltar a `/auth`.

**Detecção de `PASSWORD_RECOVERY`:** dupla — `supabase.auth.onAuthStateChange` observando o evento `PASSWORD_RECOVERY`, e um fallback que combina `window.location.hash.includes("type=recovery")` com a existência de sessão via `getSession()`. Sem link de recuperação válido a tela mostra "invalid or has expired" e não expõe o formulário.

**Redirect URL usada:** `window.location.origin + "/reset-password"` — derivada em runtime, sem host fixo no código.

**Allowlist do Supabase para `https://regtech-zenith.vercel.app/reset-password`: NÃO VERIFICADO.** A lista de redirect URLs não é legível pelas ferramentas disponíveis e sua alteração é configuração remota, excluída deste HOLD. Fica como pendência explícita: sem essa entrada (ou um wildcard `https://regtech-zenith.vercel.app/**`), o link de reset volta para a Site URL em vez da rota.

**Enumeração de usuários:** a resposta é sempre a mesma frase genérica, o erro de `resetPasswordForEmail` é deliberadamente ignorado e não há diferença de tempo perceptível nem de estado da UI entre endereço existente e inexistente.

**Nenhum teste real de envio de e-mail foi feito.**

---

## 3. FASE 4A — modelo de convite

**Migration:** `supabase/migrations/20260903155918_ea63dd41-00d5-40ea-8b5d-810aec296cc1.sql` (timestamp `20260903155918`).

**Histórico local** (últimos): `20260827021715`, `20260828001545`, `20260829014810`, `20260903154807`, `20260903155918`.
**Histórico remoto** (`supabase_migrations.schema_migrations`, últimos): idênticos, `20260903155918` no topo. Local e remoto sincronizados, sem pendências.

**SQL integral aplicada:** ver o arquivo da migration — cria o enum `invitation_status ('pending','accepted','expired','revoked')`; adiciona `token_hash`, `token_preview`, `status`, `revoked_at`, `revoked_by`, `accepted_by`, `resend_count`, `last_sent_at`, `idempotency_key`; faz `DROP COLUMN token`; torna `invited_by` nullable com FK `ON DELETE SET NULL`; cria os quatro índices; adiciona o CHECK de coerência; `REVOKE ALL ... FROM anon`, `GRANT` para `authenticated` e `service_role`, RLS reafirmada.

**Schema final verificado no banco:** `id, email, role, country_code, invited_by, accepted_at, expires_at, created_at, updated_at, token_hash NOT NULL, token_preview, status NOT NULL default 'pending', revoked_at, revoked_by, accepted_by, resend_count NOT NULL default 0, last_sent_at, idempotency_key`. 0 linhas.

- **Policies:** uma só — `platform_admin manages invitations`, `ALL`, `TO authenticated`, `USING`/`WITH CHECK` = `is_platform_admin()`.
- **Grants (ACL real):** `postgres`, `authenticated`, `service_role` = `arwdDxtm`. **`anon` ausente** — revogado.
- **Índices:** PK `id`; `platform_invitations_email_idx`; único `token_hash`; único parcial `(lower(email), role, coalesce(country_code,''))` onde `status='pending'`; único parcial `idempotency_key` quando não nulo; `(status, expires_at)`.
- **Constraints:** PK; FKs `invited_by`/`accepted_by`/`revoked_by` → `auth.users` com `ON DELETE SET NULL`; CHECK `platform_invitations_status_coherence`.
- **Trigger:** apenas `platform_invitations_updated_at` (pré-existente).
- **RLS:** enabled.

**Token em texto puro:** nenhum. A coluna `token` foi removida e não existe mais no schema; `token_hash` é `NOT NULL` e único. `token_preview` é reservado para um sufixo curto não reversível de exibição, hoje sempre nulo (0 linhas na tabela).

**`SECURITY DEFINER`:** a migration 4A **não criou nenhuma função**. Verificado: `accept_invitation` / `expire_invitations` não existem. Os avisos do linter vêm de funções antigas e propositais (`has_role`, `is_platform_admin`, etc.).

**Como `status = 'expired'` será mantido:** modelo **derivado, com materialização preguiçosa**. A verdade é sempre `status='pending' AND expires_at > now()`; nenhuma linha vira `expired` sozinha. A RPC de aceite (Fase 7) recusa convites vencidos e grava `expired` no mesmo comando; a listagem administrativa exibe o estado derivado. Um job só entraria se houvesse necessidade de limpeza em lote — não há. O índice `(status, expires_at)` serve exatamente essa consulta. O CHECK permite `expired` com `accepted_at` e `revoked_at` nulos, e o índice parcial `pending` libera o slot de unicidade assim que a linha sai de `pending`, permitindo reconvite.

**Dois aceites simultâneos:** o aceite será um único `UPDATE ... WHERE id = ? AND status = 'pending' AND expires_at > now()` dentro da RPC transacional. O primeiro adquire o lock de linha; o segundo bloqueia, revalida sob `READ COMMITTED` e encontra `status='accepted'`, retornando zero linhas — devolve "convite já utilizado" e **não** concede papel. A concessão do papel acontece no mesmo comando, e `user_roles` tem `UNIQUE (user_id, role)` como segunda barreira contra vínculo duplicado. Nenhum caminho cria dois vínculos.

---

## 4. PROVENANCE

- `git status --porcelain`: **vazio** (working tree limpo).
- `git diff --stat`: **vazio** (nada não commitado).
- Hash local `HEAD`: `f6c9700e4917f81163ba3c443a2c5e12190832a4`.
- Hash efetivo em `origin/main`: `f6c9700e4917f81163ba3c443a2c5e12190832a4` — **idênticos, sincronizados**.

Commits e arquivos exatos:

`1036239` "Desativou signup e reset"
- `src/routes/auth.tsx`
- `src/routes/reset-password.tsx` (novo)
- `src/routeTree.gen.ts` (gerado)
- `supabase/migrations/20260903154807_2e697a00-bcef-4753-bae1-bf438fd07da6.sql` (novo)
- `roadmap.md`
- `.lovable/plan.md` → arquivado em `.lovable/plan/…-2026-09-03.md`

`f6c9700` "Aplicou migração de fase 4A"
- `supabase/migrations/20260903155918_ea63dd41-00d5-40ea-8b5d-810aec296cc1.sql` (novo)
- `src/integrations/supabase/types.ts` (regenerado)
- `roadmap.md`

**Ordem:** em ambos os casos a **migration foi aplicada no banco antes do commit**. O fluxo é: aprovação da migration → execução remota → regeneração de `types.ts` → commit/sync. Por isso `types.ts` já contém as colunas novas em `f6c9700`, e o remoto registrou `20260903155918` antes do push.

---

## 5. DESENHO DA FASE 6 — somente plano, nada implementado

Tudo abaixo é desenho. Nenhuma dependência instalada, nenhum secret criado.

### Princípio comum
O convite tem **token próprio da aplicação** (32 bytes aleatórios, base64url), armazenado apenas como `sha256` em `token_hash`. O papel vive na linha do convite e **nunca** no `user_metadata`, nunca no browser, nunca no JWT antes do aceite.

### 5.1 Usuário inexistente

1. **Criação da identidade:** a server function autenticada valida o chamador por `has_capability()`, grava o convite (`status='pending'`, `token_hash`, `expires_at`, `idempotency_key`) e só então importa `supabaseAdmin` dentro do handler para chamar `inviteUserByEmail(email, { redirectTo })`. Isso cria a linha em `auth.users` sem senha e sem confirmação, dispara o trigger `handle_new_user` — que agora apenas cria o `profiles`, **sem papel** — e envia o e-mail de convite do próprio Supabase.
2. **Um único e-mail:** o token próprio viaja *dentro* do `redirectTo` do `inviteUserByEmail`: `redirectTo = ${APP_PUBLIC_URL}/invite/accept?t=<token>`. O Supabase anexa seus próprios parâmetros de sessão ao mesmo link. Um clique, um e-mail, dois segredos ortogonais — o do Supabase estabelece a sessão, o nosso autoriza o convite. Resend não participa deste caminho.
3. **Aceite compara e-mails:** a RPC lê a identidade pelo `auth.uid()` do JWT (nunca por parâmetro do cliente) e exige `lower(auth_email) = lower(invitation.email)`. Divergência → recusa, auditada, sem revelar o e-mail do convite.
4. **Papel só após o aceite:** o `INSERT` em `user_roles` (e em `country_cto_scopes` quando houver país) acontece exclusivamente dentro da mesma transação que faz `pending → accepted`. Antes disso o usuário está autenticado e sem nenhuma permissão — todas as policies de plataforma negam.

### 5.2 Usuário já confirmado

`inviteUserByEmail` falha para e-mail já confirmado, então o caminho é outro:

1. Grava-se o convite normalmente e envia-se um **e-mail transacional próprio via Resend** (pelo conector, server-side) com o link `${APP_PUBLIC_URL}/invite/accept?t=<token>`. Nenhum e-mail do Supabase Auth é disparado.
2. A rota `/invite/accept` verifica sessão. Sem sessão, guarda o token e manda para `/auth`; após o login volta à rota e prossegue. O token nunca vira `redirect_uri` de OAuth.
3. **Uso único:** o `UPDATE ... WHERE status='pending' AND expires_at > now()` consome a linha; o índice único em `token_hash` impede reemissão colidente e a linha aceita nunca volta a `pending`.
4. **Expiração:** validada no servidor por `expires_at > now()`, materializada como `expired` na mesma chamada quando vencida.
5. **Idempotência:** no envio, `idempotency_key` mais o índice parcial `pending` por `(email, role, country)` impedem dois convites ativos e duplicidade de disparo; no aceite, a re-execução encontra `accepted` e retorna sucesso sem criar segundo vínculo (`UNIQUE(user_id, role)` como rede final).
6. **Auditoria:** `platform_audit_log` recebe envio, reenvio, revogação e aceite — sem token, sem link, sem corpo de e-mail.

---

## Pendências que este HOLD deixa explícitas

1. Fase 0 nunca executada: a conta cujo token foi exposto continua ativa; os 4 usuários seguem todos `admin` sem backfill deliberado.
2. Allowlist de redirect do Supabase não verificada para `https://regtech-zenith.vercel.app/reset-password`.
3. Variáveis Supabase ausentes no escopo Preview da Vercel (deploy ainda com HTTP 500).

Aguardando nova autorização.
