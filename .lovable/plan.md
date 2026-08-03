# Sprint H17 — Global Core + Country Pack Navigation Flow (and Philippines go-live)

## Problema atual (verificado)

- A landing page fala do produto como se fosse um sistema Indonésia: a única
  vitrine de países é uma linha de "chips" (`COUNTRIES` em `src/lib/countryPacks.ts`),
  com Indonésia `active` e todos os outros marcados "soon". Nada é clicável e nada
  vem do Runtime real.
- O app já instala 3 packs no boot (logs confirmam: `ID v1.9.0` instalado,
  `MY v0.1.0` e `PH v0.1.0` instalados com 1 warning cada → status `degraded`).
- `/country-packs` é uma página única de cards; não existe rota de detalhe por país,
  então "clicar no pack" não leva a lugar nenhum e o usuário volta a ver o shell/dashboard.
- Filipinas está funcional (tax BIR/TRAIN, SSS, PhilHealth, Pag-IBIG, 13º, contratos,
  calendário, 2 regras de compliance, testes de conformidade e coexistência) mas
  continua "de laboratório": versão `0.1.0`, sem `interfaceVersion`, sem assinatura,
  `active: false` na lista de países.

## Objetivo

1. Landing page vende o **Core Global** (plataforma) e mostra os **Country Packs** como
   catálogo: em produção vs. roadmap. Cada pack em produção é clicável e abre a página
   daquele pack.
2. Dentro do app, `/country-packs` vira lista → detalhe (`/country-packs/PH`), com o
   mesmo modelo de dados do Runtime.
3. Filipinas promovido a pack de produção, servindo de prova do fluxo entre packs.

## Fluxo desenhado

```text
PUBLICO
  /                     Core Global (hero + camadas) + catálogo de packs
     └─ card "Philippines"  ─► /packs/ph        (página pública do pack)
     └─ card "Vietnam · soon"  ─► sem link, badge roadmap
  /packs                catálogo completo (produção + beta + roadmap)
  /packs/$country       overview público: capacidades, ruleset, moeda,
                        idiomas, motores, link p/ calculadora e API docs

APP (autenticado)
  /country-packs        lista compacta (status, versão, health)
     └─ "Open pack"  ─► /country-packs/$country
  /country-packs/$country   manifesto, providers, eventos, validator,
                            health check, assinatura, histórico
```

## Fonte de verdade única

Criar `src/lib/packs/catalog.ts` (camada de apresentação, sem I/O):
- lê `CountryRuntime.list()` para packs instalados;
- funde com a lista de roadmap (`COUNTRIES`) para países ainda sem pack;
- classifica cada país em `production | beta | roadmap` por **três** critérios
  cumulativos, não apenas versão:
  1. `status === "installed"` (não `degraded`/`failed`/`incompatible`);
  2. manifesto `>= 1.0.0`, `interfaceVersion` presente e `signatureBlock` válido;
  3. `health().status === "ok"` — avaliado em runtime, não assumido pela promoção.
  Qualquer pack que falhe (2) ou (3) cai em `beta`, mesmo que o warning não tenha
  relação com versão/assinatura. Ausente do Runtime = `roadmap`.
- o health é assíncrono, então o catálogo expõe `classify()` síncrono (status+versão+
  assinatura) e `classifyWithHealth()` para as superfícies que podem esperar; a
  landing e a rota pública usam a versão com health resolvida no loader, de modo que
  um pack que degradar depois da promoção deixa de aparecer como produção;
- devolve um `PackCard` normalizado usado pela landing, pelo catálogo público e
  pelas telas do app — sem duplicar lógica em três lugares.


## Trabalho por área

### 1. Landing (`src/routes/index.tsx`)
- Nova seção "Global Core" acima das camadas: o que o Core entrega em qualquer país
  (multi-tenant, RLS, Compliance Score, Regulatory Update Service, AI Audit, APIs).
- Substituir a linha de chips por uma grade de cards de pack: bandeira, país, moeda,
  versão do ruleset, capacidades e badge de status. Produção → `<Link to="/packs/$country">`.
- Manter pricing/footer. Head metadata da rota atualizada (Core global, não Indonésia).

### 2. Rotas públicas de pack
- `src/routes/packs/index.tsx` — catálogo (produção, beta, roadmap em três blocos).
- `src/routes/packs/$country.tsx` — página do pack com `head()` próprio
  (title/description/og por país), capacidades, motores, ruleset, idiomas,
  CTA para `/calculator` e `/api-docs`, e `notFoundComponent` para códigos inválidos.

### 3. App: lista → detalhe
- Converter `src/routes/_authenticated/country-packs.tsx` em layout (`<Outlet />`),
  criar `country-packs.index.tsx` (lista enxuta com status/health/versão + botão
  "Open pack") e `country-packs.$country.tsx` com o conteúdo detalhado que hoje está
  todo empilhado na lista (manifesto, providers, eventos, validator, health, assinatura).
- Corrigir o realce do menu lateral (`pathname.startsWith`) para não marcar dois itens.

### 4. Philippines — promoção a produção
- Manifesto: `version: "1.0.0"`, `interfaceVersion: "1.0.0"` (elimina o warning que
  hoje deixa o pack `degraded`), `requiresCore` revalidado.
- Assinatura: `src/packs/philippines/signature.ts` no mesmo padrão do
  `ID_SIGNATURE_BLOCK` (author + countersign da plataforma), com chave registrada.
- Health check ganha as verificações de assinatura equivalentes às do pack ID.
- `COUNTRIES`: `PH` passa a `active: true`; Malásia permanece stub/roadmap.
- Registro no `pack_registry` + `pack_installations` (migração Supabase com os
  GRANTs/RLS já existentes) para o pack aparecer publicado no Platform Backoffice.
- Testes: conformidade atualizada para exigir `interfaceVersion` e assinatura em PH,
  mais um teste do catálogo (`production` inclui ID e PH, `roadmap` inclui VN/TH).

## Notas técnicas

- Nenhuma mudança em Core/SDK: o catálogo consome apenas APIs públicas do
  `CountryRuntime`, respeitando o Architecture Freeze e o ADR-0018.
- Rotas públicas de pack são SSR normais e usam apenas dados do Runtime (sem
  Supabase), então não precisam de bearer e não quebram o prerender.
- A migração do `pack_registry` é a única mudança de banco e roda antes do código
  que a consome.
- Um ADR curto (`ADR-0032 — Pack Catalog Presentation Layer`) documenta a nova
  camada de apresentação e a regra de classificação production/beta/roadmap.

## Fora de escopo

- Implementar providers da Malásia, Vietnã ou Tailândia.
- Marketplace transacional / instalação dinâmica pela UI.
- Mudanças de pricing ou de motores de cálculo existentes.
