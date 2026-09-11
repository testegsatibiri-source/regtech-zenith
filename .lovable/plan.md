# Cards de Country Pack: capacidades reais e navegação

## O que foi verificado

- O card da Indonésia usa a variante "Validação" e essa variante só lista `plannedCapabilities`.
- `plannedCapabilities` é uma lista de marketing definida apenas para MY, VN, TH e SG. Indonésia e Filipinas não estão nela, por isso o card ID mostra só "Coming soon".
- O pack ID declara capacidades reais no manifesto (campo `provides`), mas hoje só a variante "Produção" mostra esse campo.
- Nenhum card leva a lugar nenhum, exceto o card de produção, que tem um link "Explore".
- Existe hoje uma única landing de país publicada: `/id`. Não há `/my` nem `/ph`.

Ou seja: não é bug de dados do manifesto — é a variante do card que ignora as capacidades reais do pack instalado.

## O que muda

### 1. Card em validação mostra capacidades reais

Quando o pack está instalado e o manifesto declara capacidades, o card lista essas capacidades reais (as mesmas que o card de produção usa), com o rótulo "Capacidades" em vez de "Planned capabilities". Só quando não há pack instalado é que a lista anunciada (planejada) continua sendo usada.

O texto "Coming soon" some para packs instalados; no lugar entra a linha de versão do pack (`ID Pack v2.2.0`), igual ao card de produção. O selo de status continua vindo do runtime.

### 2. Cards clicáveis

Cada card passa a ter um destino, nesta ordem de prioridade:

1. Landing local do país, quando existir (hoje apenas Indonésia → `/id`).
2. Página do pack `/packs/{código}`, quando o pack é de produção.
3. Sem link, quando o país é apenas roadmap — mantém o rótulo de status e ganha a marcação "em construção".

O card inteiro vira alvo de clique (com foco por teclado e estado de hover), e o texto do link final passa a refletir o destino: "Ver site local" para landing de país, "Explorar {país}" para a página do pack.

O mapa de landings fica em um único lugar, junto com o mapa de domínios já existente, para que Vietnã/Tailândia/Singapura entrem depois só adicionando uma linha.

### 3. Sem tocar nas regras

Nada de `classify()` / `classifyWithHealth()`, manifesto, assinatura ou `commercialReady`. A mudança é só de apresentação e navegação.

## Detalhes técnicos

- `src/components/packs/CountryPackCard.tsx`: `ValidationCard` passa a usar `pack.provides` + `capabilityLabel()` quando `pack.installed`, com fallback para `plannedCapabilities`; `RoadmapPackCard` ganha o rótulo "em construção"; ambos os cards com destino são envolvidos por `Link` (`asChild`-style wrapper, sem link aninhado dentro do link).
- `src/lib/packs/catalog.ts`: novo mapa `LANDING_ROUTES` (`{ ID: "/id" }`) e campo opcional `landingPath` em `CatalogEntry`, preenchido em `toEntry()` e em `roadmapEntries()`. Nenhuma alteração na lógica de classificação.
- Testes: novo teste de componente/rota garantindo que (a) o card ID renderiza as capacidades vindas do manifesto e não "Coming soon", (b) o card ID aponta para `/id`, (c) card de roadmap não é clicável.

## Critérios de aceite

- [ ] Card da Indonésia em `/packs` lista as capacidades reais do pack ID, vindas do runtime.
- [ ] Card da Indonésia leva para a landing `/id` ao clicar.
- [ ] Cards de produção continuam levando para `/packs/{país}`.
- [ ] Países sem pack aparecem como "em construção" e não são clicáveis.
- [ ] Nenhuma lista de capacidades ou versão fica escrita fixa no componente.
- [ ] Regras de classificação, manifesto e `commercialReady` inalterados.
