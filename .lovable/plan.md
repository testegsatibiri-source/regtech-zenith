# Modelo híbrido: Lovable + GitHub + Vercel + Supabase próprio

Objetivo: continuar desenvolvendo dentro da Lovable, permitir que outros devs trabalhem fora dela via GitHub, e publicar em Vercel apontando para projetos Supabase seus. Sim, dá para fazer com o que já existe no repositório — o pipeline de CI/CD já está escrito; falta adaptar o alvo de build, parametrizar o backend e ligar os secrets.

## Topologia acordada

```text
Lovable (preview)      -> Lovable Cloud (backend gerenciado)   [dev do dia a dia]
Vercel staging         -> Supabase lyjxnceaoaivnantwmni        [homologação]
Vercel production      -> Supabase novo projeto "uboard-prod"  [produção]
```

Fluxo de código: Lovable <-> GitHub (sync bidirecional, já conectado a `regtech-zenith`) -> GitHub Actions -> Vercel.
Dados: apenas o schema é migrado (28 migrações). Nada de dados de teste é copiado.

## O que precisa ser feito

### 1. Build para Vercel
Hoje o build usa nitro com preset Cloudflare (padrão do `@lovable.dev/vite-tanstack-config`). Para Vercel, adicionar o preset `vercel` no `vite.config.ts` acionado por variável de ambiente, de forma que:
- dentro da Lovable, nada muda (continua Cloudflare);
- no CI da Vercel, `BUILD_TARGET=vercel` produz a saída que a Vercel entende.

Isso é aditivo e não quebra o preview.

### 2. Backend parametrizável por ambiente
O código já lê `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` e, no servidor, `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Nenhuma alteração de código é necessária — basta cadastrar valores diferentes por ambiente na Vercel. Vou apenas documentar a matriz e adicionar um `.env.example` para quem clonar o repo fora da Lovable.

### 3. Preparar os projetos Supabase
- Criar o projeto de produção (o de staging já existe).
- Aplicar as 28 migrações em ambos via `supabase db push` (o workflow já faz isso).
- Habilitar `pgvector` (usado pelo UADA).
- Semear as chaves públicas de assinatura dos packs em `pack_signing_keys` — sem elas o Boot Health Gate rejeita os Country Packs e o app sobe sem Indonésia/Filipinas. Vou criar uma migração de bootstrap versionada com as chaves públicas atuais (chave pública não é segredo).
- Configurar o Auth (e-mail/senha + provedor Google direto no Supabase, ver item 5).

### 4. Ligar o pipeline
Os workflows `release-validation.yml` (staging) e `production-deploy.yml` (produção) já têm gate de migração, health check, aprovação e rollback — estão inertes só por falta de secrets. Ações necessárias (na interface do GitHub/Vercel, feitas por você):
- criar o projeto Vercel ligado ao repo e **desligar** o deploy automático da Vercel para `main` (quem publica é a Action);
- cadastrar os secrets dos ambientes `staging` e `production` conforme `docs/governance/secrets-inventory.md`.

Vou revisar os workflows para garantir que injetam as variáveis Supabase corretas no build da Vercel.

### 5. Desacoplar as duas dependências que quebram fora da Lovable
- **Login Google**: hoje passa pelo broker da Lovable. Vou criar uma camada que usa `supabase.auth.signInWithOAuth` quando estiver fora do preview e mantém o broker dentro do preview. Configuração do provedor Google no painel dos seus projetos Supabase fica com você.
- **IA**: criar `src/lib/ai/provider.ts` como única porta de saída (baseURL + chave + mapa de modelos por variável de ambiente) e migrar `src/lib/audit.functions.ts` e os módulos do UADA para ela. Assim, em Vercel você pode usar OpenAI (ou manter o gateway) só trocando variáveis.

### 6. Guia para devs externos
`docs/governance/local-development.md`: clonar, `bun install`, `.env.local` apontando para o Supabase de staging, `bun dev`, rodar testes e o fluxo de branches (`feature/*` -> `develop` -> `release` -> `main`) que os workflows já esperam.

## Riscos e pontos de atenção

- **Divergência de banco**: o preview Lovable continua em outro backend. Regra: toda mudança de schema entra como migração versionada; nada de alteração manual em banco.
- **Chaves privadas de assinatura dos packs**: continuam sem custódia formal. `scripts/sign-id.ts` já suporta modo custódia; falta você guardar as chaves privadas num cofre antes do lançamento.
- **Serviço de IA na Vercel**: a `LOVABLE_API_KEY` é emitida pela plataforma; em produção externa o recomendado é usar um provedor próprio via o módulo do item 5.
- **Domínio**: `uboardasia.com` é seu; ao migrar a publicação, é repontar DNS para a Vercel (janela de propagação, sem lock-in).

## Ordem de execução

1. Preset Vercel no build + `.env.example` + doc da matriz de variáveis.
2. Migração de bootstrap das chaves públicas dos packs.
3. Revisão dos workflows (injeção de env no build Vercel).
4. Módulo único de IA e migração dos consumidores.
5. OAuth Google com fallback broker/preview.
6. Guia de desenvolvimento externo.

Itens 1–3 habilitam o deploy em staging. 4–5 são o desacoplamento efetivo. Nada disso altera o comportamento do app dentro da Lovable.
