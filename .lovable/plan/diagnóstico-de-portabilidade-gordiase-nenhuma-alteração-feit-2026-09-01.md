# Diagnóstico de portabilidade — Gordiase (nenhuma alteração feita)

## 1. GitHub

**Não existe repositório GitHub conectado hoje.** O único remote do projeto é o Git interno da plataforma
(`git.private.lovable-gcp.code.storage/...`) mais um espelho em S3. Ou seja: hoje não há cópia do código
em nenhuma conta sua fora da plataforma. Esse é o item mais urgente antes de qualquer lançamento.

O que **está** versionado: todo o `src/`, `docs/`, `.github/workflows/`, `scripts/`, `supabase/migrations/`
(28 migrações), `supabase/config.toml`, os arquivos gerados de integração e até o `.env` (que contém apenas
URL + chave publicável do backend — nada secreto).

O que **não está** versionado e é necessário para rodar:

- Segredos de runtime: `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (guardados no cofre da plataforma).
- Chaves de assinatura dos Country Packs — as chaves públicas vivem na tabela `pack_signing_keys` no banco,
  e as privadas foram usadas só em scripts temporários (`/tmp/sign-id-manifest.mjs`). **Não há script de
  assinatura versionado e reproduzível para a Indonésia** (só existe `scripts/sign-ph.ts`).
- Dados operacionais do banco (parâmetros, snapshots UADA, chaves de API) — schema está versionado, dados não.

**Monorepo:** sim, na prática — um único repositório com fronteiras internas explícitas
(`src/lib` Core, `src/sdk` contrato congelado, `src/packs/{indonesia,malaysia,philippines}`,
`src/routes` superfície HTTP), documentadas em `docs/architecture/repository-strategy.md` e vigiadas por
CODEOWNERS + workflows `ci-core/ci-sdk/ci-packs`. Não é um monorepo com workspaces npm/pacotes publicáveis.

## 2. Dependências da Lovable

| Dependência | Onde | Criticidade |
| --- | --- | --- |
| `@lovable.dev/cloud-auth-js` (login Google) | `src/integrations/lovable/index.ts`, `src/routes/auth.tsx` | Média |
| AI Gateway `ai.gateway.lovable.dev` | `src/lib/audit.functions.ts`, `src/lib/uada/gateway/aiGateway.server.ts`, `.../embeddings.server.ts`, `InferenceService.server.ts` | Média |
| `@lovable.dev/vite-tanstack-config` (build) | `vite.config.ts` | Baixa |
| `previewAuthStorage.ts` (sessão dentro do preview) | cliente Supabase | Baixa (inerte fora do preview) |
| Backend Supabase gerenciado pela plataforma | tudo | Média |
| Hospedagem/deploy e domínio atual | produção | Média |

Clonando e rodando fora da plataforma **sem mudanças**, param de funcionar: o botão "Entrar com Google",
os recursos de IA (narrativa de auditoria e todo o UADA — embeddings, inferência, score), e o build precisa
do pacote de config da Lovable (público no npm, então funciona, mas amarra a stack).
Tudo o mais — motores de folha, packs, SDK, filings, RLS, APIs públicas — é código-padrão TanStack Start.

## 3. Autenticação

É **Supabase Auth** de verdade: e-mail/senha, sessão, RLS e o gate `_authenticated` usam `supabase.auth`.
A única peça proprietária é o OAuth Google, que passa pelo broker da Lovable e depois faz
`supabase.auth.setSession()`. Substituir = configurar o provedor Google direto no Supabase e trocar a chamada
de `lovable.auth.signInWithOAuth` por `supabase.auth.signInWithOAuth`. É uma função, não uma reescrita.

## 4. IA

Fluxo atual: `LOVABLE_API_KEY` → endpoint OpenAI-compatível `https://ai.gateway.lovable.dev/v1`
(chat completions + embeddings), usado em dois lugares — a narrativa do Compliance Score e o UADA
(indexação, embeddings pgvector, inferência, benchmark, score).

Por ser OpenAI-compatível, a troca é quase só de `baseURL` + chave. Já existe meio caminho:
`createUadaAiGatewayProvider` centraliza o provider do UADA. Faltam: um único módulo de provider
(`baseURL`/chave/modelo por variável de ambiente), migrar `audit.functions.ts` (que hoje chama `fetch`
direto) para ele, e um mapa de nomes de modelo (Gemini ↔ OpenAI).

## 5. Banco

PostgreSQL (Supabase) com `pgvector`. Schema, funções, triggers, políticas de RLS e grants estão **todos**
em `supabase/migrations/` e versionados. Nada no banco depende de serviço proprietário da Lovable —
é Postgres + Supabase padrão, migrável para qualquer projeto Supabase (ou Postgres gerenciado + Auth próprio)
com `supabase db push`. Os workflows de deploy já assumem `supabase link` + `db push` com refs próprios.

## 6. Deploy e domínio

Hoje a publicação real é a da própria plataforma (worker Cloudflare via Nitro). Em paralelo, o repositório
já tem um pipeline **completo para Vercel + Supabase CLI** (`.github/workflows/production-deploy.yml`),
hoje inerte por falta dos secrets. Para publicar fora, é preciso: criar o repositório GitHub, cadastrar os
secrets, definir o target de build (Vercel/Node em vez do worker) e recriar as variáveis de ambiente.

Domínio: `uboardasia.com` está apontado para a plataforma via DNS, mas o domínio é seu — basta repontar
os registros; o certificado é emitido pelo host e é reemitido por quem hospedar depois. Sem lock-in real,
só uma janela de propagação.

## 7. Veredito

**A. Pode continuar sem preocupação**

- Core, SDK, Country Packs, motores de folha/filings/leave/privacy — código padrão, portável.
- Schema e migrações do banco — 100% versionados.
- Roteamento, API pública v1, observabilidade, CI.
- Domínio.

**B. Existe dependência, mas dá para substituir depois**

- OAuth Google via broker da Lovable → Supabase OAuth direto (troca pontual).
- AI Gateway → qualquer provedor OpenAI-compatível, após centralizar o provider.
- `@lovable.dev/vite-tanstack-config` → config Vite explícita.
- Deploy → pipeline Vercel já escrito, falta ligar.

**C. Lock-in / risco crítico a resolver ANTES do lançamento**

1. **Não existe repositório GitHub.** Hoje o código só vive na plataforma. Risco de continuidade puro.
2. **Segredos sem cópia própria** — sem inventário exportado, um provisionamento fora da plataforma trava.
3. **Chaves privadas de assinatura dos packs sem custódia nem script versionado** (Indonésia). Se perdidas,
   não é possível reassinar um manifesto — e o Boot Health Gate rejeita packs sem assinatura válida.
   Este é o lock-in mais silencioso e o mais caro de descobrir tarde.
4. **Sem procedimento de backup/restore do banco fora da plataforma** (o schema é reprodutível; os dados não).

## 8. Recomendação de sequência (quando você autorizar)

1. Conectar o GitHub e validar que um clone limpo builda.
2. Documentar o inventário de segredos (`docs/governance/secrets-inventory.md` já existe — atualizar com
   o que é da plataforma) e exportar os valores para um cofre seu.
3. Versionar `scripts/sign-id.ts` e definir custódia das chaves privadas dos packs.
4. Criar `src/lib/ai/provider.ts` como única porta de saída de IA e migrar `audit.functions.ts` para ela.
5. Trocar o OAuth Google para Supabase direto, com o broker como fallback no preview.
6. Ligar o pipeline Vercel em staging e provar um deploy fora da plataforma antes do lançamento.

Itens 1–3 são pré-lançamento. Itens 4–6 podem ficar para depois, sem bloquear.
