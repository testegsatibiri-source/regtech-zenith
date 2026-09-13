# Corrigir os country packs sumindo no site publicado

## Problema observado (verificado)

No site publicado (uboardasia.com):

- `/id` responde com erro de servidor e a mensagem interna "Indonesia Country Pack is not installed".
- A página inicial mostra os seis países como "Roadmap": 0 em produção, 0 em validação. Indonésia, Malásia e Filipinas desaparecem.

No ambiente de desenvolvimento as mesmas telas funcionam, e a instalação dos packs também funciona quando forçada com a configuração de produção. Ou seja: **os packs em si estão corretos; o que falha é o site empacotado para publicação.**

Diagnóstico ainda não confirmado. Há duas hipóteses distintas, a serem testadas separadamente:

- **A — eliminação do módulo de registro.** `src/sdk/bootstrap.ts` é importado apenas por efeito colateral em `src/lib/packs/catalog.ts` e nada do que ele exporta é consumido. Empacotadores podem descartá-lo quando o projeto ou uma dependência declara `sideEffects: false`, ou quando a otimização remove o módulo por parecer inútil.
- **B — duas cópias isoladas do runtime.** `src/lib/packs/loader.server.ts` é carregado dinamicamente; se o empacotamento gerar duas instâncias do registro, uma recebe os packs e a outra é consultada vazia.

## Passos

1. **Reproduzir e confirmar a causa**
   Gerar a **build de produção real** (`vite build` no mesmo formato usado na publicação) e servir esse artefato — não basta rodar o código-fonte com variável de ambiente de produção, porque isso não reproduz minificação nem remoção de código morto. Abrir `/` e `/id` contra a build servida e registrar quantos packs o runtime enxerga.
   Distinguir as hipóteses: inspecionar o artefato gerado para ver se o código de registro dos três packs está presente (hipótese A descartada) e, em caso afirmativo, instrumentar/verificar se o registro consultado é o mesmo que recebeu os packs (hipótese B). Só avançar com a causa confirmada por evidência.


2. **Corrigir o registro dos packs**
   Conforme o resultado do passo 1, uma destas correções (a menor que resolva):
   - tornar o registro explícito onde é consumido, em vez de depender de um import só de efeito colateral;
   - unificar o caminho de carregamento para que catálogo e runtime compartilhem a mesma instância;
   - ajustar a configuração de empacotamento para preservar o módulo de registro.

   Sem tocar em classificação, manifesto, assinatura, `commercialReady` ou regras de pack.

3. **Comportamento defensivo na página indonésia**
   Hoje, se o pack não estiver disponível, `/id` estoura erro de servidor. Passar a exibir a página com um aviso de status indisponível em vez de quebrar, mantendo status e versão vindos do runtime quando existirem.

4. **Página inicial**
   Confirmar que os cartões voltam a mostrar Indonésia, Malásia e Filipinas em validação, com versão e capacidades reais, e que a contagem ("X em produção · Y em validação · Z no roadmap") fica correta.

5. **Teste de regressão em dois níveis**
   - Teste na suíte comum: falha se o runtime não enxergar os três packs instalados. Barato, mas não reproduz remoção de código morto.
   - Verificação contra o artefato real: após a build de produção, conferir que os packs aparecem no catálogo servido (inspeção do artefato e/ou requisição a `/` e `/id` na build). É essa checagem que pega a classe de falha atual — a suíte em modo de teste passaria mesmo com o bug de volta.

6. **Verificação**
   Typecheck, suíte completa, build de produção servida e conferência visual de `/` e `/id` nessa build. Publicação só mediante ordem sua.

## Detalhes técnicos

- Arquivos prováveis: `src/sdk/bootstrap.ts`, `src/lib/packs/catalog.ts`, `src/lib/packs/loader.server.ts`, `src/lib/packs/packs.functions.ts`, `src/routes/id.index.tsx`, `vite.config.ts` (apenas se a causa for de empacotamento).
- Fora de escopo: `classify()` / `classifyWithHealth()`, manifestos, blocos de assinatura, política de confiança, Core/SDK além do registro, banco de dados, fluxos do GitHub e domínios.

## Critérios de aceite

- [ ] Causa confirmada na build de produção servida, com as hipóteses A e B distinguidas por evidência
- [ ] `/id` responde sem erro de servidor na build de produção
- [ ] Página inicial mostra Indonésia, Malásia e Filipinas em validação, com versão real
- [ ] Status, versão e ruleset continuam vindo do runtime, nunca fixos no texto
- [ ] Nenhuma alteração em classificação, manifesto, assinatura ou liberação comercial
- [ ] Teste na suíte cobrindo "packs instalados aparecem no catálogo"
- [ ] Checagem equivalente feita contra o artefato de build de produção, não só no modo de teste
- [ ] Typecheck e suíte completa verdes
