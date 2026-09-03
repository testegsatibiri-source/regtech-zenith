# HOLD MANTIDO — Evidências (Fases 3, 8, 4A), incidente, papéis e desenho revisado da Fase 6

Decisão arquitetural registrada: **Opção C**.
- Onda A (agora): convites para papéis de plataforma (`platform_invitations`).
- Onda B (sprint própria, depois): `company_members`, convites de empresa e refatoração integral de `owns_company()` e da RLS derivada.

Nada de Resend, envio, aceite, RPC, migration adicional, secret, e-mail, commit, push ou deploy neste turno. Fases 5, 6 e 7 permanecem em HOLD.

> Nota de processo: estou em modo de planejamento, logo `roadmap.md` **não foi editado**. As novas tarefas (runbook de papéis, outbox de convite, homologação do reset) estão registradas na seção "Pendências" abaixo e vão para o roadmap no primeiro turno de execução autorizado.

---

## 0. INCIDENTE — investigação do `sub` exposto

Investigação estritamente leitura. Nada deletado, nada revogado.

**Limitação de alcance, declarada de saída:** as ferramentas de banco deste editor estão vinculadas **exclusivamente** ao projeto da aplicação (`vavcyfcmkvimxxwpkuck`). O projeto `lyjxnceaoaivnantwmni` (Postgres de staging) **não é acessível daqui** — não há credencial nem rota de leitura disponível neste ambiente. Portanto tudo abaixo é verificação contra o projeto da aplicação; a verificação contra `lyjxnceaoaivnantwmni` precisa ser feita fora do editor (SQL editor daquele projeto), e o comando de leitura sugerido está no fim desta seção.

Resultados no projeto da aplicação:

| Verificação | Resultado |
|---|---|
| `auth.users` com prefixo `ece23d17` | **0 linhas** |
| `auth.sessions` com prefixo `8014862f` | **0 linhas** |
| `auth.sessions` no total | 6, todas pertencentes a 3 dos 4 usuários conhecidos |
| `auth.refresh_tokens` no total | 21, distribuídos nessas 6 sessões |
| `auth.identities` | 5 (1 `email`, 4 `google`), todas dos 4 usuários conhecidos |

Sessões (prefixos, sem UUID completo): `205b2d39…` (usuário `8a299d7c…`), `44261a47…` e `db68640a…` (`bbb6fa16…`), `f14e323d…`, `3a06e91c…` e `97e62ece…` (`d4162828…`). Nenhuma tem `not_after` definido — ou seja, **nenhuma sessão está encerrada por prazo**; permanecem renováveis enquanto houver refresh token válido. Há refresh tokens já rotacionados/revogados em três sessões (2, 7 e 7 respectivamente), o que é o comportamento normal de rotação, não revogação de sessão.

**Por que nenhum dos quatro usuários corresponde ao `sub` exposto:** porque o `sub` `ece23d17…` simplesmente **não existe neste projeto de autenticação**. As três explicações compatíveis com a evidência, em ordem de probabilidade:

1. O token foi emitido por **outro projeto Supabase** — o de staging (`lyjxnceaoaivnantwmni`) tem sua própria instância `auth`, com `auth.users` e `sub` completamente independentes. Um `sub` de staging nunca casa com um `sub` de produção/preview.
2. O usuário existiu neste projeto e foi **removido** depois da emissão do token (o `sub` sobreviveria só no JWT). Improvável: os 4 `profiles` batem 1:1 com os 4 `auth.users`, sem órfãos.
3. O `sub` pertence a um token de serviço/anon, não a um usuário final.

A hipótese (1) é a única sustentada pelos dados que consigo ler. **Consequência prática:** o incidente provavelmente está confinado ao projeto de staging, e é lá que a revogação precisa acontecer — não aqui. Isso também explica por que a "Fase 0" nunca encontrou a conta para revogar no projeto da aplicação.

**Verificação a executar fora do editor**, no SQL editor de `lyjxnceaoaivnantwmni` (somente leitura):

```sql
select left(id::text,8) as u, email is not null as tem_email,
       email_confirmed_at is not null as confirmado, last_sign_in_at, created_at
from auth.users where id::text like 'ece23d17%';

select left(s.id::text,8) as s, left(s.user_id::text,8) as u,
       s.created_at, s.refreshed_at, s.not_after,
       (select count(*) from auth.refresh_tokens rt where rt.session_id = s.id) as tokens,
       (select count(*) from auth.refresh_tokens rt where rt.session_id = s.id and rt.revoked) as revogados
from auth.sessions s where s.id::text like '8014862f%';
```

Se a sessão `8014862f…` aparecer com `not_after` nulo e ao menos um refresh token não revogado, ela **continua renovável** e a revogação é urgente — mas continua fora deste HOLD, aguardando autorização.

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

**`inviteUserByEmail` não receberá `admin` pelo trigger:** o único caminho automático era o `INSERT` em `user_roles` dentro de `handle_new_user()`, agora removido. Usuários criados por convite administrativo entram sem papel; a atribuição passa a ser um passo explícito no aceite (Fase 7).

---

## 2. FASE 8 — recuperação de senha

**`src/routes/auth.tsx`** — commit `1036239`: removidos `Tabs`, o estado `name` e toda a função `signUp` (que chamava `supabase.auth.signUp` com `emailRedirectTo: origin + "/dashboard"`). Entrou o modo `"signin" | "forgot"`, o botão "Forgot your password?", a nota "Access is invite-only" e o `head()` de SEO. `signInWithPassword` e o OAuth Google permanecem inalterados.

```ts
await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
  redirectTo: window.location.origin + "/reset-password",
});
toast.success("If that address has an account, a reset link is on its way.");
```

**Rota `/reset-password`** (`src/routes/reset-password.tsx`, `ssr: false`): valida o link, pede nova senha + confirmação (mínimo 8 caracteres, igualdade obrigatória), chama `supabase.auth.updateUser({ password })` sem senha atual e em seguida `signOut({ scope: "global" })` antes de voltar a `/auth`.

**Detecção de `PASSWORD_RECOVERY`:** dupla — `onAuthStateChange` observando o evento `PASSWORD_RECOVERY`, mais um fallback que combina `window.location.hash.includes("type=recovery")` com sessão existente via `getSession()`. Sem link válido, a tela mostra "invalid or has expired" e não expõe o formulário.

**Redirect URL:** `window.location.origin + "/reset-password"` — derivada em runtime, sem host fixo no código.

**Allowlist:** `https://regtech-zenith.vercel.app/**` — **confirmada pelo usuário como configurada**. Cobre `/reset-password`.

**Enumeração de usuários:** resposta sempre idêntica, erro de `resetPasswordForEmail` deliberadamente ignorado, sem diferença de estado da UI entre endereço existente e inexistente.

**Status: implementado, NÃO HOMOLOGADO.** Nenhum teste real de envio/recebimento de e-mail foi feito. A homologação depende do SMTP (Fase 5) e continua pendente.

---

## 3. FASE 4A — modelo de convite

**Migration:** `supabase/migrations/20260903155918_ea63dd41-00d5-40ea-8b5d-810aec296cc1.sql` (timestamp `20260903155918`).

**Histórico local** (últimos): `20260827021715`, `20260828001545`, `20260829014810`, `20260903154807`, `20260903155918`.
**Histórico remoto** (`supabase_migrations.schema_migrations`): idêntico, `20260903155918` no topo. Local e remoto sincronizados, sem pendências.

**SQL aplicada:** enum `invitation_status ('pending','accepted','expired','revoked')`; colunas `token_hash`, `token_preview`, `status`, `revoked_at`, `revoked_by`, `accepted_by`, `resend_count`, `last_sent_at`, `idempotency_key`; `DROP COLUMN token`; `invited_by` nullable com FK `ON DELETE SET NULL`; quatro índices; CHECK de coerência; `REVOKE ALL ... FROM anon`; `GRANT` para `authenticated` e `service_role`; RLS reafirmada.

**Schema final verificado no banco:** `id, email, role, country_code, invited_by, accepted_at, expires_at, created_at, updated_at, token_hash NOT NULL, token_preview, status NOT NULL default 'pending', revoked_at, revoked_by, accepted_by, resend_count NOT NULL default 0, last_sent_at, idempotency_key`. 0 linhas.

- **Policies:** uma só — `platform_admin manages invitations`, `ALL`, `TO authenticated`, `USING`/`WITH CHECK` = `is_platform_admin()`.
- **Grants (ACL real):** `postgres`, `authenticated`, `service_role` = `arwdDxtm`. **`anon` ausente** — revogado.
- **Índices:** PK `id`; `platform_invitations_email_idx`; único `token_hash`; único parcial `(lower(email), role, coalesce(country_code,''))` onde `status='pending'`; único parcial `idempotency_key` quando não nulo; `(status, expires_at)`.
- **Constraints:** PK; FKs `invited_by`/`accepted_by`/`revoked_by` → `auth.users` `ON DELETE SET NULL`; CHECK `platform_invitations_status_coherence`.
- **Trigger:** apenas `platform_invitations_updated_at` (pré-existente).
- **RLS:** enabled.

**Token em texto puro:** nenhum. A coluna `token` não existe mais; `token_hash` é `NOT NULL` e único. `token_preview` guardará apenas um sufixo curto não reversível para exibição — hoje sempre nulo.

**`SECURITY DEFINER`:** a migration 4A **não criou nenhuma função**. Verificado: `accept_invitation` / `expire_invitations` não existem. Os avisos do linter vêm de funções antigas e propositais (`has_role`, `is_platform_admin`, etc.).

**`status = 'expired'`:** modelo **derivado com materialização preguiçosa**. A verdade é `status='pending' AND expires_at > now()`; nenhuma linha vira `expired` sozinha. A RPC de aceite recusa vencidos e grava `expired` no mesmo comando; a listagem administrativa exibe o estado derivado. Sem job. O índice `(status, expires_at)` serve essa consulta; o CHECK permite `expired` com `accepted_at`/`revoked_at` nulos, e o índice parcial `pending` libera o slot de unicidade assim que a linha sai de `pending`, permitindo reconvite.

**Dois aceites simultâneos:** `UPDATE ... WHERE id = ? AND status = 'pending' AND expires_at > now()` dentro da RPC transacional. O primeiro adquire o lock de linha; o segundo bloqueia, revalida sob `READ COMMITTED`, encontra `accepted`, afeta zero linhas, devolve "convite já utilizado" e **não** concede papel. A concessão do papel ocorre no mesmo comando, com `UNIQUE (user_id, role)` como segunda barreira.

---

## 4. USUÁRIOS ADMIN — evidência funcional (nenhum papel alterado)

Os 4 usuários têm `admin` por herança do trigger antigo, não por decisão. Evidência de uso real:

| id | e-mail | empresas | funcionários | folhas | ações de plataforma | packs | parâmetros | escopo país | criado |
|---|---|---|---|---|---|---|---|---|---|
| bbb6fa16… | e***@g*** | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2026-07-12 |
| 609ffcc2… | u***@g*** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2026-07-22 |
| 8a299d7c… | x***@g*** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2026-07-27 |
| d4162828… | t***@g*** | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2026-08-04 |

Leitura: **nenhum** usuário exerceu função de plataforma (zero registros em `platform_audit_log`, `pack_registry`, `regulatory_parameters`, `country_cto_scopes`). Dois são donos de empresa — papel de negócio, não de plataforma. Dois não têm nenhuma atividade.

**Papel que a evidência sustenta** (proposta, não aplicada):

- `bbb6fa16…` — dono de 2 empresas, primeiro usuário, identidade `email` + `google`: **`platform_admin`** (é o operador do produto) **e** `admin` de negócio.
- `d4162828…` — dono de 1 empresa, sessões mais recentes: **`admin`** de negócio. `platform_admin` só se for o segundo operador — precisa de confirmação sua.
- `609ffcc2…` e `8a299d7c…` — sem empresa e sem atividade: **`viewer`**, ou nenhum papel até que o vínculo seja declarado.

Isso é inferência a partir de dados de uso, não uma decisão. A atribuição definitiva é sua.

### Runbook transacional de correção de papéis (com prevenção de lockout)

Executar como uma única transação, depois de aprovada a matriz:

```text
1. PRÉ-CHECK  select count(*) from user_roles where role='platform_admin';
              -- registrar o valor de partida
2. BEGIN
3. INSERT dos papéis novos (ON CONFLICT (user_id, role) DO NOTHING)
   -- SEMPRE conceder antes de revogar
4. DELETE dos papéis a remover
5. GUARDA DE LOCKOUT (dentro da transação):
   se (select count(*) from user_roles where role='platform_admin') < 1
      então RAISE EXCEPTION 'lockout evitado: nenhum platform_admin restante'
   se o usuário que executa a operação perderia o próprio platform_admin
      e não houver outro, também aborta
6. Registrar em platform_audit_log: actor, alvo mascarado, papel antes/depois
7. COMMIT  (qualquer falha → ROLLBACK, estado intacto)
8. PÓS-CHECK  reler user_roles e confirmar a matriz aprovada
9. Conferir acesso real a /platform com uma sessão ativa ANTES de fechar a janela
```

Regras que tornam o lockout improvável: conceder sempre antes de revogar; nunca reduzir `platform_admin` abaixo de dois; o executor não remove o próprio papel na mesma transação; e a operação corre por `service_role` (a RLS de `user_roles` nega INSERT/UPDATE/DELETE via Data API, então nenhum caminho de browser consegue fazê-la).

---

## 5. FASE 6 — desenho revisado (somente plano)

Correções incorporadas em relação à versão anterior.

### 5.1 Papel do Resend — corrigido

- **Resend API não participa do convite nativo.** O e-mail do `inviteUserByEmail` é gerado pelo GoTrue.
- **Resend SMTP participa**: quando o Custom SMTP estiver ativo (Fase 5), *todo* e-mail de Auth — convite, recuperação, confirmação — sai pela infraestrutura do Resend como transporte. A distinção certa é: **Auth = SMTP; e-mail transacional próprio da aplicação = API**.
- Resend API só é usada no caminho "usuário já confirmado", onde o GoTrue não tem fluxo aplicável.

### 5.2 Idempotência de envio — corrigido

O índice único parcial em `idempotency_key` garante **uma linha de convite**, não **um e-mail entregue**. Envio é efeito colateral externo, e nenhum índice de banco o torna exactly-once.

Desenho de **outbox** com estado próprio de entrega, separado do estado do convite:

```text
invitation_deliveries
  id, invitation_id, provider ('gotrue'|'resend'), provider_message_id,
  idempotency_key (único), attempt, state, last_error, created_at, updated_at

state: queued -> sending -> sent | failed | unknown
```

- `queued`: linha criada na mesma transação do convite. Nada foi chamado ainda.
- `sending`: marcada imediatamente antes da chamada ao provedor; impede disparo concorrente.
- `sent`: provedor confirmou e devolveu `provider_message_id`.
- `failed`: erro determinístico (endereço inválido, 4xx). Reprocessável apenas por reenvio explícito.
- `unknown`: timeout ou erro de rede — **a chamada pode ter sido entregue**. Nunca reenviar automaticamente; exige reconciliação (consulta ao provedor pelo `provider_message_id` ou pela chave de idempotência) ou decisão humana.

A chave de idempotência da aplicação é repassada ao provedor quando ele a suporta, de modo que uma repetição não gere segundo e-mail. `resend_count` e `last_sent_at` viram derivados da outbox, com cooldown aplicado sobre `last_sent_at`.

### 5.3 Exposição do token na URL — mitigada

`?t=<token>` vaza para logs de servidor, histórico do navegador, analytics e cabeçalho `Referer`. Mitigações, todas obrigatórias:

1. **Remoção imediata da URL:** o componente de `/invite/accept` lê o parâmetro no primeiro efeito e chama `history.replaceState(null, '', '/invite/accept')` antes de qualquer requisição, chamada de analytics ou renderização de conteúdo externo. O token vive em memória, não na barra de endereços nem no histórico.
2. **`Referrer-Policy: no-referrer`** na rota (via cabeçalho de resposta e `<meta name="referrer">`), impedindo que qualquer recurso externo receba a URL original.
3. **Sem analytics na rota:** nenhuma chamada de telemetria com URL antes do `replaceState`; a rota é excluída de qualquer captura automática de page view.
4. **Logs:** o middleware de log redige o parâmetro `t` da query string; `platform_audit_log` registra o `id` do convite, nunca o token nem o link.
5. **Alternativa mais forte, a avaliar na implementação:** entregar o token via fragmento (`#t=`), que não é enviado ao servidor nem aparece em logs de acesso — ao custo de exigir JavaScript. Decisão fica para o momento de construir.

### 5.4 Token e login — sem `localStorage`

**Não persistir o token cru em `localStorage`** (legível por qualquer script, sobrevive à sessão, vaza em XSS).

Fluxo quando o usuário chega sem sessão:

1. `/invite/accept` recebe o token, limpa a URL e chama uma **server function que troca o token cru por uma referência curta**: valida o hash, confirma `pending` e não vencido, e grava um **cookie temporário HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age ~10 min**, contendo apenas um identificador opaco de continuação (não o token, não o `id` do convite).
2. O usuário é enviado a `/auth`. O token cru já não existe no cliente.
3. Após o login, a volta a `/invite/accept` lê o cookie no servidor, resolve a continuação e executa o aceite. O cookie é apagado na mesma resposta, com sucesso ou falha.
4. `SameSite=Lax` é suficiente: o retorno é navegação de topo do mesmo site. `Strict` quebraria o retorno vindo do link de e-mail.
5. Equivalente aceitável: guardar a continuação numa tabela server-side de vida curta (`invitation_continuations`, TTL 10 min, consumo único) e manter no cookie apenas seu identificador — mesma propriedade, com trilha de auditoria.

### 5.5 Restante do fluxo (inalterado, revalidado)

**Usuário inexistente:** server function autenticada valida o chamador por `has_capability()`, grava convite + linha de outbox `queued`, importa `supabaseAdmin` dentro do handler e chama `inviteUserByEmail(email, { redirectTo: ${APP_PUBLIC_URL}/invite/accept?t=<token> })`. Cria a identidade sem senha, dispara `handle_new_user` (só `profiles`, sem papel) e envia **um único e-mail** — o do GoTrue, transportado pelo SMTP do Resend, carregando os dois segredos ortogonais no mesmo link. O aceite compara `lower(auth_email) = lower(invitation.email)` usando o `auth.uid()` do JWT, nunca um e-mail vindo do cliente. O papel é inserido em `user_roles` **exclusivamente** dentro da transação que faz `pending → accepted`.

**Usuário já confirmado:** `inviteUserByEmail` falha, então o convite vai por **e-mail transacional próprio via Resend API** (server-side, pelo conector), com o mesmo link. Login primeiro, aceite depois, cookie de continuação no meio. Uso único garantido pelo `UPDATE` condicional; expiração por `expires_at > now()`; idempotência de envio pela outbox e de aceite pela reexecução que encontra `accepted` e retorna sucesso sem criar segundo vínculo.

**Auditoria:** envio, reenvio, revogação e aceite em `platform_audit_log` — sem token, sem link, sem corpo de e-mail.

---

## 6. PROVENANCE

- `git status --porcelain`: **vazio**. `git diff --stat`: **vazio**.
- `HEAD` local: `f6c9700e4917f81163ba3c443a2c5e12190832a4`.
- `origin/main`: `f6c9700e4917f81163ba3c443a2c5e12190832a4` — **idênticos**.

`1036239` "Desativou signup e reset": `src/routes/auth.tsx`, `src/routes/reset-password.tsx` (novo), `src/routeTree.gen.ts` (gerado), `supabase/migrations/20260903154807_….sql` (novo), `roadmap.md`, `.lovable/plan.md` → arquivado.

`f6c9700` "Aplicou migração de fase 4A": `supabase/migrations/20260903155918_….sql` (novo), `src/integrations/supabase/types.ts` (regenerado), `roadmap.md`.

### Desvio registrado

**As duas migrations (`20260903154807` e `20260903155918`) foram aplicadas no banco ANTES do commit correspondente.** A ordem executada foi: aprovação → aplicação remota → regeneração de `types.ts` → commit/sync. Isso significa que houve uma janela em que o banco estava à frente do repositório, e que nenhuma validação em staging precedeu a alteração de produção/preview. **Desvio de processo, registrado como tal.**

Processo exigido das próximas etapas, sem exceção:

```text
1. Migration versionada e commitada no repositório
2. Sincronização (push) — repositório é a fonte da verdade
3. Validação em staging (aplicação + testes + verificação de RLS/grants)
4. Aplicação deliberada em produção, com autorização explícita
```

Nenhuma migration futura será aplicada antes do passo 2.

---

## 7. Pendências

**Resolvidas:**
- Variáveis Supabase no escopo Preview da Vercel — configuradas.
- Deploy abrindo corretamente (HTTP 500 encerrado).
- Allowlist `https://regtech-zenith.vercel.app/**` — configurada.

**Abertas:**
1. **Reset de senha: NÃO HOMOLOGADO** — falta teste real de envio/recebimento, que depende do SMTP (Fase 5).
2. **Incidente:** verificar `ece23d17…` / `8014862f…` em `lyjxnceaoaivnantwmni`; revogar lá, se confirmado. Fora do alcance deste editor.
3. **Papéis:** os 4 usuários continuam todos `admin` por herança. Runbook acima aguarda aprovação da matriz.
4. **Sessões:** nenhuma das 6 sessões ativas tem `not_after`; todas seguem renováveis.
5. **Fases 5, 6 e 7** em HOLD.

Aguardando nova autorização.
