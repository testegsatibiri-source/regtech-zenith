# Modelo híbrido: Lovable + GitHub + Vercel + Supabase próprio

Objetivo: manter a Lovable como ambiente de desenvolvimento rápido, enquanto GitHub + Vercel + Supabase se tornam a infraestrutura independente e reproduzível do produto. Dá para fazer com o que já existe no repositório: o pipeline de CI/CD já está escrito; falta destravar o gate, adaptar o alvo de build, parametrizar o backend e ligar os secrets.

## Arquitetura-alvo

```text
                    GitHub (regtech-zenith)
                              |
                       GitHub Actions
                 +------------+------------+
                 |                         |
              STAGING                  PRODUCTION
              Vercel                    Vercel
       Supabase lyjxnceao...       Supabase uboard-prod
                 +------------+------------+
                       mesmo codigo
                       mesmo schema (migrations)

   Lovable Preview -> Lovable Cloud   (dev rapido)   <-> GitHub
```

Dados: apenas schema. As 28 migrações são a única fonte de verdade; nada de dados de teste é copiado.

## Regras de governança aprovadas

- **Default seguro no build**: `BUILD_TARGET` ausente = comportamento Lovable/Cloudflare. Só `BUILD_TARGET=vercel` muda o preset. Variável faltando nunca quebra o preview.
- **Sem alteração estrutural manual no banco**: schema change -> migration -> GitHub -> staging -> teste -> produção.
- **`lyjxnceaoaivnantwmni` é exclusivamente staging.**
- **Migrations são forward-only.** Rollback de aplicação é seguro; rollback de schema não é. Reversão só para migrations explicitamente marcadas como reversíveis e testadas. O playbook e o `rollback.yml` serão ajustados para refletir isso.
- **Chaves de assinatura de packs**: públicas em Git/migration; privadas nunca em Git, nunca no banco, nunca no frontend. Custódia resolvida antes do lançamento.
- **Nenhuma chave de IA no frontend.** Todo acesso a IA passa por servidor.

## Etapa 0 — Destravar o CI (bloqueador)

Antes de qualquer coisa, investigar e corrigir os erros atuais do CI. Sem o gate verde, o resto do pipeline é construído sobre base instável. Entregável: causa de cada falha identificada e corrigida, ou registrada como débito com justificativa explícita.

## Sequência de execução

1. **Build Vercel** — preset `vercel` no `vite.config.ts` acionado por `BUILD_TARGET`, com default Lovable/Cloudflare.
2. **`.env.example` + matriz de secrets** — documentar variáveis por ambiente (`VITE_SUPABASE_*` no cliente; `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, chaves de IA no servidor). Nenhuma mudança de código necessária: o app já lê essas variáveis.
3. **Supabase staging** — configurar o projeto próprio, habilitar `pgvector` e configurar Auth (e-mail/senha + Google).
4. **Aplicar as 28 migrations** via `supabase db push` pelo workflow, com um **step de verificação de extensões** (`pgvector` presente) para que um ambiente novo seja reproduzível em vez de assumido.
5. **Bootstrap das chaves públicas dos packs** — migração versionada semeando `pack_signing_keys` com as chaves públicas atuais. Sem isso o Boot Health Gate rejeita Indonésia e Filipinas.
6. **CI staging ligado** — cadastrar os secrets do ambiente `staging`; validar `release-validation.yml` de ponta a ponta (migração, build, deploy, smoke test).
7. **Prova de portabilidade** — clone limpo fora da Lovable: `git clone`, `bun install`, `bun run build`, `bun test`. Só depois disso se pode afirmar que o projeto está desacoplado.
8. **AI provider único** — `src/lib/ai/provider.ts` como única porta de saída (baseURL, chave e mapa de modelos por variável de ambiente). Migrar `src/lib/audit.functions.ts` e os módulos do UADA (`aiGateway.server.ts`, `embeddings.server.ts`, `InferenceService.server.ts`) para ele. Trocar de fornecedor passa a ser configuração.
9. **Google OAuth** — broker Lovable no preview, `supabase.auth.signInWithOAuth` fora dela. Teste explícito de: login, callback, refresh, logout, sessão persistente, redirect, criação/associação de empresa e RLS após OAuth.
10. **Produção** — criar `uboard-prod`, aplicar migrations, cadastrar secrets, aprovar deploy.

## Critério de Go para produção

Todos verdes, nesta ordem: GitHub sincronizado · CI verde · clone independente · build Vercel · Supabase staging · 28 migrations · RLS/policies · Country Pack Boot Health · auth por e-mail · Google OAuth · AI provider independente · health check · aprovação de produção · Vercel + Supabase PROD.

## Ações que dependem de você (interface, não código)

- Criar o projeto Vercel ligado ao repo e **desligar** o deploy automático da Vercel para `main` (quem publica é a Action).
- Cadastrar os secrets nos ambientes `staging` e `production` conforme `docs/governance/secrets-inventory.md`.
- Configurar o provedor Google no painel dos seus projetos Supabase.
- Definir a custódia das chaves privadas de assinatura dos packs (`scripts/sign-id.ts` já suporta modo custódia).

## Riscos remanescentes

- **Schema drift** entre Lovable Cloud e os projetos próprios — mitigado pela regra de migrations, mas exige disciplina de quem desenvolve fora.
- **IA em produção externa**: `LOVABLE_API_KEY` é emitida pela plataforma; o item 8 é o que remove essa amarra.
- **Domínio**: `uboardasia.com` é seu; migrar a publicação é repontar DNS para a Vercel — janela de propagação, sem lock-in.
