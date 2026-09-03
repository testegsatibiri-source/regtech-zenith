# Auditoria READ-ONLY — E-mail no regtech-zenith e viabilidade do Resend

Nenhum arquivo foi alterado. Nenhum e-mail enviado, nenhum secret consultado.

## 1. Estado atual comprovado

### Dependências
- `resend`: **não instalado**. `@react-email/*`: **não instalado**. Nenhum `nodemailer`, `sendgrid`, `postmark`, `mailgun` (`package.json` completo revisado).
- `bunfig.toml:7` cita `@lovable.dev/email-js` e `@lovable.dev/webhooks-js` apenas numa allowlist de idade mínima de release — **não são dependências do projeto**.

### Código de e-mail
- Não existe nenhuma chamada de envio de e-mail no projeto. Zero referências a `RESEND`, SMTP, templates de e-mail, filas de e-mail ou webhooks de e-mail.
- Único ponto próximo: `src/lib/observability/alerts.ts:45-49` — `fireEmail()` é um **stub** que só grava log (`log.info("alert:email", ...)`); o comentário diz "reuses future email connector". `Channel` inclui `"email"` (linha 6) e a migration `20260721114102...sql:315` aceita `channel IN ('slack','email',...)` em `alert_notifications`.
- Sem diretório `supabase/functions` — **nenhuma Edge Function** existe.

### Código server-side adequado para API key secreta
Sim, abundante: ~20 módulos `*.functions.ts` (`createServerFn`) e rotas `src/routes/api/public/*` (TanStack server handlers). Padrão do projeto lê secrets com `process.env[...]` **dentro do handler**. Existe `src/integrations/supabase/auth-middleware.ts` (`requireSupabaseAuth`) para autenticar chamadas, e `src/lib/apiAuth.ts` + `check_api_quota()` (rate limit/quota por API key) para endpoints públicos.

## 2. Supabase Auth

Fluxos hoje:
- **Cadastro/confirmação**: `src/routes/auth.tsx:38-51` — `supabase.auth.signUp` com `emailRedirectTo: window.location.origin + "/dashboard"`. O e-mail é enviado pelo GoTrue com o remetente **padrão da plataforma** (Lovable Cloud), template padrão.
- **Recuperação de senha**: **não implementada** — nenhuma chamada a `resetPasswordForEmail`.
- **Convite de usuário**: **não implementado por e-mail**. A tabela `platform_invitations` (migration `20260721114102...sql:89-99`, expiração 7 dias) existe mas **não é lida nem escrita por nenhum código da aplicação** — nenhuma chamada a `inviteUserByEmail`.
- **Alteração de e-mail**: **não implementada** (nenhum `updateUser({email})`).
- **Magic link / OTP**: não implementado.

Configuração: `supabase/config.toml` contém apenas `project_id`. **Sem `[auth.email]`, sem Custom SMTP declarado, sem Auth Hook (`hook_send_email`)**, sem migrations tocando `auth`. Conclusão: hoje o projeto depende 100% do remetente padrão gerenciado.

## 3. Lovable Cloud

- `@lovable.dev/cloud-auth-js` (usado em `src/integrations/lovable/index.ts`) é **apenas o broker de OAuth social** (Google/Apple/Microsoft): faz o fluxo OAuth e chama `supabase.auth.setSession`. **Não envia e-mail nenhum.**
- Não há integração de e-mail do Lovable ativa neste projeto (sem `src/routes/lovable/email/*`, sem templates, sem domínio de e-mail configurado).
- **Risco de duplicação ao migrar para Resend: baixo.** Como nenhum fluxo customizado existe, trocar o SMTP do Auth substitui o remetente padrão em vez de duplicar. Duplicação só apareceria se, no futuro, coexistissem um Auth Hook e um Custom SMTP para o mesmo evento — evitar escolher os dois.

## 4. Separação arquitetural recomendada

| Classe | Fluxos | Recomendação |
|---|---|---|
| **Auth (GoTrue)** | confirmação de cadastro, recuperação de senha, convite, alteração de e-mail | **Resend via Custom SMTP** no Supabase Auth. Zero código, mantém os fluxos nativos e o controle de tokens dentro do GoTrue (não passam pela aplicação). Templates customizados via Auth → Email Templates. |
| **Transacional da aplicação** | alertas de observabilidade (`fireEmail`), avisos de filings/prazos, convites de plataforma se um dia forem enviados | **Resend API**, exclusivamente em código server-side (`*.functions.ts` / rota `src/routes/api/*`), com `RESEND_API_KEY` em `process.env` lido dentro do handler. |
| **Marketing/newsletter** | — | Fora de escopo. Não misturar com o domínio transacional (reputação de envio). |

## 5. Secrets e ambientes (somente nomes)

| Variável | Onde deve existir |
|---|---|
| `RESEND_SMTP_USER` (`resend`) e `RESEND_SMTP_PASSWORD` (= API key) | **Supabase → Auth → SMTP Settings**, por projeto (staging e prod, chaves distintas). Não vai para o repositório. |
| `RESEND_API_KEY` | **Vercel Preview** + **Vercel Production** (server-only, sem `VITE_`); e GitHub Environment Secrets `staging`/`production` se o CI precisar. **Não** em Supabase Edge Function secrets — o projeto não usa Edge Functions. |
| `RESEND_FROM_EMAIL` | Vercel Preview + Vercel Production (não é secret, mas por ambiente). |
| `RESEND_WEBHOOK_SECRET` | **Somente se** for criado um endpoint de eventos (bounce/complaint). Não é necessário na etapa inicial. |

Nomenclatura do projeto exige sufixo por ambiente em GitHub Environments (`RESEND_API_KEY_STAGING` / `_PROD`), consistente com `docs/governance/secrets-inventory.md`.

## 6. Domínio e remetente

- Nenhum remetente de e-mail configurado em código. As únicas referências a domínio são de **conteúdo**, não de envio: `src/routes/index.tsx:50,54` (`https://uboardasia.com/` em og:url/canonical), `src/routes/index.tsx:323` (`mailto:enterprise@uboardasia.com`), `src/routes/__root.tsx:98` (`@UBoardAsia`).
- `uboardasia.com` aparece como domínio customizado do projeto, mas **não presumo propriedade nem adequação como domínio de envio** — isso precisa ser confirmado pelo responsável.
- **Sim, será necessário verificar um domínio no Resend** (registros SPF/DKIM/DMARC no DNS) antes de qualquer envio a terceiros. O sandbox `onboarding@resend.dev` só entrega ao dono da conta.
- Recomendação: usar um subdomínio dedicado (ex.: `mail.<dominio>` ou `notify.<dominio>`) para isolar reputação, e atenção ao conflito com delegação NS de e-mail já existente no domínio.

## 7. Segurança — confirmações

- `VITE_` **nunca** para chave Resend: qualquer `VITE_*` é inlinada no bundle do browser pelo Vite. Confirmado como regra.
- Chave nunca no navegador nem no Git: leitura só via `process.env` dentro de handler server-side; `.env.example` guarda apenas nomes.
- `service_role` **não** deve ser usada para envio de e-mail: ela bypassa RLS e não tem relação com SMTP/Resend. Envio usa `RESEND_API_KEY`; leitura de dados do destinatário deve usar `requireSupabaseAuth` (RLS como o usuário) e só cair no client admin quando estritamente necessário.
- Endpoints de envio: exigir `requireSupabaseAuth` (ou verificação de API key + `check_api_quota()` no caso de `/api/public/*`), validação Zod da entrada, destinatário **derivado do servidor** (nunca aceito livre do browser), e idempotência por evento.
- Logs: proibido registrar API key, tokens de confirmação/recuperação, magic links ou corpo do e-mail. Registrar apenas `template`, hash/ID do evento e resultado. O logger atual (`src/lib/observability/logger.ts`) não tem redaction — precisaria de cuidado no call site.

## 8. Lacunas, riscos e plano mínimo

### Lacunas
1. Nenhum template de e-mail, nenhum helper de envio, nenhum registry.
2. Recuperação de senha ausente na UI de auth — hoje um usuário que esquece a senha não tem saída.
3. `platform_invitations` é uma tabela órfã: sem UI, sem envio, sem aceite.
4. `fireEmail` é stub — alertas P1 marcados como "email" silenciosamente não notificam ninguém.
5. Sem domínio de envio verificado.

### Riscos de duplicação
- Baixo hoje. Alto **apenas** se no futuro forem habilitados Custom SMTP **e** Auth Hook simultaneamente, ou se a integração de e-mail gerenciada do Lovable for ativada em paralelo ao Resend no mesmo domínio (conflito de delegação DNS).

### Plano mínimo (após autorização)
1. **Decidir o domínio de envio** e verificá-lo no Resend (painel Resend + DNS). Nada de código.
2. **Auth via Custom SMTP**: configurar host/porta/credenciais Resend em Supabase Auth (staging primeiro), ajustar `Site URL` e `Redirect URLs` por ambiente, customizar os 4 templates. Validar cadastro real em staging.
3. **Fechar a lacuna de recuperação de senha**: adicionar `resetPasswordForEmail` + rota de definição de nova senha (`src/routes/auth.tsx`, nova rota `src/routes/reset-password.tsx`).
4. **Transacional**: criar `src/lib/email/resend.server.ts` (cliente + guarda de env) e `src/lib/email/send.functions.ts` (server fn autenticada, Zod, destinatário derivado do servidor); ligar `fireEmail` em `src/lib/observability/alerts.ts` a esse helper.
5. **Opcional**: endpoint de eventos Resend em `src/routes/api/public/webhooks/resend.ts` com verificação de assinatura (`RESEND_WEBHOOK_SECRET`) — só se bounce/complaint forem necessários.
6. Atualizar `.env.example` e `docs/governance/secrets-inventory.md`; ADR de decisão (SMTP para auth, API para transacional).

### Arquivos que mudariam no futuro
`package.json`, `.env.example`, `docs/governance/secrets-inventory.md`, `src/lib/observability/alerts.ts`, `src/routes/auth.tsx`, novos: `src/lib/email/*`, `src/routes/reset-password.tsx`, (opcional) `src/routes/api/public/webhooks/resend.ts`, novo ADR.

### Itens manuais nos painéis
- **Resend**: criar conta/domínio, publicar SPF/DKIM/DMARC no DNS, gerar API keys separadas para staging e produção, (opcional) configurar webhook.
- **Supabase** (staging e prod, separadamente): Auth → SMTP Settings (host/porta/usuário/senha, sender name/address), Site URL e Redirect URLs, templates de e-mail, rate limit de e-mails de auth.
- **Vercel**: `RESEND_API_KEY` e `RESEND_FROM_EMAIL` nos escopos Preview e Production (server-only).
- **GitHub**: secrets equivalentes nos Environments `staging`/`production` se o CI precisar deles.

## Sugestão

Comece pela decisão de domínio e pelo **Custom SMTP em staging** — é o passo de maior valor com zero código e risco praticamente nulo, e desbloqueia a recuperação de senha (a lacuna funcional mais séria hoje). O Resend API para transacional pode esperar até que exista um caso de uso real além do stub de alertas.
