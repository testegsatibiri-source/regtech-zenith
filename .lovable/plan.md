# Auditoria da landing: Indonésia, Malásia e Filipinas

## O que está acontecendo

Os três packs existem e estão instalados e ativos no sistema, mas a página inicial os apresenta como se fossem apenas países planejados:

- A home mostra "0 packs in production · 6 in validation or roadmap".
- Indonésia, Malásia e Filipinas aparecem numa lista genérica, sem versão, sem as capacidades reais e com o texto "Under construction".
- O cartão da Indonésia não leva à página indonésia (`/id`), mesmo com ela publicada.
- No rodapé, a lista "Country Packs" está vazia, porque só inclui packs classificados como produção.

Causa: a home separa os países pela lista de "packs liberados para uso comercial" (hoje vazia, porque nenhum pack está com liberação comercial) em vez de usar a classificação real de cada pack. Além disso, ela desenha os países em validação com o cartão simplificado de roadmap, que ignora versão, capacidades reais e link local. A página `/packs` já usa o cartão completo e mostra tudo corretamente — a inconsistência é só na home e no rodapé.

## O que vai mudar

1. **Agrupamento correto na home**: os países passam a ser separados pela classificação de cada pack (Produção / Validação / Roadmap), como já acontece em `/packs`. Indonésia, Malásia e Filipinas passam para o bloco "Validação".
2. **Cartão completo para os packs em validação**: bandeira, nome, selo de status vindo do sistema, versão do pack e as capacidades realmente declaradas por ele. Nada de texto fixo.
3. **Cartão da Indonésia clicável** levando a `/id`. Malásia e Filipinas continuam sem link enquanto não tiverem página própria, exibindo "Coming soon".
4. **Contador honesto**: a frase de resumo passa a refletir os três grupos reais, sem afirmar produção onde não há.
5. **Rodapé**: a lista de países passa a incluir os packs instalados, com link para a página local quando existir e para a página do pack quando for produção.
6. **Teste**: estender o teste de navegação dos cartões para cobrir a home — Indonésia com link `/id` e capacidades reais; Malásia e Filipinas sem link.

## Fora de escopo

Nada de mexer em classificação, manifesto, assinatura, liberação comercial ou nas regras de cada pack. A mudança é só de apresentação.

## Detalhes técnicos

- `src/routes/index.tsx`: substituir o split por `availableCodes` (de `getPacksPageData().available`) por split por `tier` (`production` / `beta` / `roadmap`) do catálogo já carregado pelo loader; trocar `RoadmapPackCard` por `CountryPackCard` no grupo de validação (variante derivada de `pack.tier`), mantendo `RoadmapPackCard` só no grupo roadmap; ajustar a linha de contagem para os três grupos.
- `src/components/SiteFooter.tsx`: listar `packs.filter(p => p.installed)`, usando `landingPath` quando presente (`<a href>`), senão `/packs/$country` para produção, senão texto simples.
- `src/lib/packs/__tests__/pack-card-navigation.test.tsx`: novos casos renderizando o grupo de validação com os três packs.
- Verificação: `bunx tsgo --noEmit`, `bunx vitest run` e checagem da home renderizada (`/`) confirmando versão, capacidades e link `/id`.
