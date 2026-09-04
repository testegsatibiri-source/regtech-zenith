# Fase C — Rescisão indonésia (PP 35/2021): pesangon, UPMK, UPH e cadeia PKWT→PKWTT

A Fase C é o último bloqueio interno do gate comercial do pacote indonésio (junto com o parecer jurídico da Fase D, que corre em paralelo, e o dado salarial oficial DEBT-024/025). Hoje o `SeparationProvider` só existe nas Filipinas; na Indonésia não há cálculo de rescisão nenhum — qualquer desligamento em cliente real exigiria conta manual fora do sistema.

## O que você vai ver quando terminar

- Ao desligar um funcionário indonésio, o sistema calcula a rescisão completa por motivo de desligamento: pesangon (indenização), uang penghargaan masa kerja (prêmio de tempo de serviço) e uang penggantian hak (direitos pendentes: férias não gozadas, THR proporcional), com as tabelas oficiais do PP 35/2021.
- Contratos PKWT (temporário) geram a compensação de fim de contrato (1 mês por ano, art. 15 do PP 35/2021) e o sistema alerta quando um PKWT renovado ultrapassa 5 anos e vira PKWTT (efetivo) por força de lei.
- Cada desligamento fica registrado com motivo, valores, memória de cálculo e quem aprovou — auditável depois do fato.

## Etapas

1. **Checkpoint normativo antes de codar (bloqueante)** — confirmar contra o texto do PP 35/2021, com citação de artigo e ayat registrada no arquivo de parâmetros, dois pontos que o resto do cálculo depende:
   - **Regra de fração de tempo de serviço.** O PP 35/2021 expressa as tabelas em faixas ("masa kerja 1 tahun atau lebih tetapi kurang dari 2 tahun"), o que não é o mesmo que arredondar para o ano mais próximo — a faixa é definida pelo piso. Confirmar o texto e codificar a faixa exata, não um arredondamento inferido; nenhum `Math.round` sobre anos.
   - **Componentes completos do UPH (art. 40 ayat 4).** Confirmar item a item: férias anuais não gozadas, custo de retorno ao local de contratação, e demais itens previstos em PK/PP/PKB. Atenção específica ao componente de 15% (perumahan serta pengobatan dan perawatan) do UU 13/2003 art. 156(4)(c): é preciso verificar se ele permanece exigível após a Cipta Kerja e o PP 35/2021, porque incluí-lo indevidamente infla o valor tanto quanto omiti-lo o reduz. A decisão fica documentada com a citação que a sustenta, e o item entra como componente configurável se a fonte for ambígua.
   Se qualquer um dos dois não puder ser fechado com fonte oficial, a lacuna vira DEBT explícito **antes** do código, e o motor retorna `complete: false` naquele caso em vez de calcular um valor plausível.
2. **Parâmetros oficiais PP 35/2021** — `src/packs/indonesia/params/pp35-2021.ts`: tabela de pesangon por faixa de tempo de serviço (1–9 meses de salário), tabela UPMK (2–10 meses a partir de 3 anos), componentes do UPH conforme fechado no checkpoint, e a matriz de multiplicadores por motivo (arts. 36–47: eficiência, fusão/aquisição, fechamento, falência, aposentadoria, falecimento, doença prolongada, falta grave, pedido de demissão etc., cada um com seu fator 1.0×/0.75×/0.5× de pesangon e direito ou não a UPMK). Cada valor com base legal e `sourceStatus: "official"`, seguindo o padrão das tabelas TER.
3. **Motor de rescisão ID** — `src/packs/indonesia/engines/separation.ts`, espelhando a arquitetura filipina: `ID_SEPARATION_GROUNDS` (motivos com multiplicadores), `computeSeparationPay` (pesangon × fator + UPMK + UPH, com a faixa de tempo de serviço vinda dos parâmetros), e avisos legais por motivo (mediação bipartite, PHI em caso de litígio). O `SeparationProvider` do SDK tem campos filipinos (twin notice, DOLE); a Fase C introduz uma extensão por país sem quebrar o contrato atual — campo opcional de notas específicas no provider, sem mexer no que as Filipinas já usam.

4. **Compensação PKWT e cadeia PKWT→PKWTT** — regra de fim de contrato PKWT (1 mês de salário por 12 meses, proporcional, art. 15) e verificação que hoje só mede prazo (≤ 5 anos) passa a também marcar a conversão automática para PKWTT no histórico do contrato, com trilha de auditoria.
5. **Tela e gravação** — fluxo de desligamento na tela do funcionário/contrato: escolha do motivo, prévia da memória de cálculo, confirmação que grava o caso de desligamento e vincula ao contrato. Nova tabela `separation_cases` (company_id, employee_id, motivo, datas, componentes calculados, total, aprovador) via migração com RLS e GRANTs no padrão das demais.
6. **Testes e conformidade** — `src/packs/indonesia/__tests__/separation.test.ts` com vetores oficiais por motivo e tempo de serviço, incluindo casos de fração propositais (ex.: 8 anos e 3 meses; 2 anos e 11 meses; 11 meses) para travar a regra de faixa, e um caso que cobre cada componente do UPH fechado no checkpoint; teste da cadeia PKWT→PKWTT; gate local `bunx tsgo --noEmit`, `bun test`, `bunx eslint .` verdes.
7. **Governança** — registro na ADR-0038/release notes de que a Fase C fechou, com as citações do checkpoint; `commercialReady` continua `false` até o parecer jurídico (Fase D) e o dado salarial oficial (DEBT-024/025) fecharem, e só então bump de versão + reassinatura (D7).


## Fora de escopo

- Acordos coletivos (PKB) e convenções acima do piso legal — o motor calcula o mínimo legal; excedentes entram como ajuste manual.
- Fluxo de litígio no PHI (registro de mediação basta nesta fase).
- Bump de versão e reassinatura: ficam para o D7, após parecer jurídico e dado salarial.

## Detalhes técnicos

- Arquivos novos: `src/packs/indonesia/params/pp35-2021.ts`, `src/packs/indonesia/engines/separation.ts`, `src/packs/indonesia/__tests__/separation.test.ts`, `src/lib/separation-id.functions.ts` (ou extensão de `separation.functions.ts`), migração `separation_cases`.
- Arquivos tocados: `src/sdk/providers/SeparationProvider.ts` (extensão opcional, sem quebra), `src/lib/engines/id-pack.ts`, `src/routes/_authenticated/employees.tsx` e/ou `contracts.tsx`, `src/packs/indonesia/index.ts` (rulesetVersion sobe, `commercialReady` permanece false).
- Migração `separation_cases` segue o bloco obrigatório: CREATE TABLE → GRANT authenticated/service_role → ENABLE RLS → policies por dono da empresa (`owns_company`), com updated_at trigger. Aplicação deliberada, forward-only.
- Base de cálculo do salário rescisório: salário fixo mensal (base + adicional fixo), conforme art. 40/2 — quando só houver `base_salary`, registrar advertência de componente fixo ausente na memória de cálculo.
- Sem `VITE_` em segredos; sem dependências novas de Node-only; tudo roda no runtime atual.
