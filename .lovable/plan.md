# Auditoria do Country Pack Filipinas — o que falta para homologar todas as funções

Leitura completa do pack (`src/packs/philippines/*`), do manifesto/assinatura, das regras de classificação e das telas da área logada que consomem o pack.

## Situação atual (verificada)

- Pack v1.6.0, ruleset `PH-2024.6`, interface 1.0.0, assinatura dupla presente, `commercialReady: false`.
- Capacidades entregues: payroll, tax, benefits, thirteenth, calendar, contracts, audit, rules, filings, separation, leave (11 de 12 do catálogo).
- Correções fiscais da Fase 1 estão implementadas de verdade: tabela SSS escalonada RA 11199 em `params.ts`, base do 13º por `annualGrossEarned` (PD 851), teto de ₱90.000 do BIR na retenção, salário mínimo NCR parametrizado.
- Identificadores estatutários (TIN/SSS/PhilHealth/Pag-IBIG), prazos escalonados por dígito, e os 5 exportadores de arquivos (1601-C, 1604-C, R-3, RF-1, MCRF) estão implementados e testados.
- Os vazamentos antigos para a Indonésia foram fechados: calendário, auditoria, filings, rescisão e licenças resolvem o pack pelo `country_code` da empresa.
- `health()` cobre tax, benefits, 13º, contratos, calendário, prazos, rescisão e licenças; 9 suítes de teste no pack.

Conclusão: o bloqueio para homologação **não é mais de motor de cálculo** — é de evidência regulatória, cobertura funcional residual e superfícies de produto.

## O que falta — bloqueadores de homologação

### B1. Validação de layout com portal real (Fase 5, DEBT-022)
Os cinco arquivos estatutários são gerados mas nunca foram aceitos por um upload real (eFPS/eSubmission/EPRS/HDMF). Ação: rodar um empregador piloto, registrar o comprovante de aceite por formulário e anexar à evidência de release.

### B2. Dossiê de evidência da ADR-0036
A ADR exige, para `commercialReady: true`: SSS Circular 2024, BIR RR 11-2018/TRAIN, DOLE Wage Order NCR-24 e o texto do PD 851. Hoje as fontes estão apenas como comentário no código. Ação: criar `docs/governance/legal-opinions/PH-*.md` com citação e data de vigência por tabela, mais parecer jurídico local (equivalente ao DEBT-029 da Indonésia).

### B3. Vigência das tabelas
Os parâmetros são rotulados 2024 (SSS 2024-004, PhilHealth 2023-0027, Wage Order NCR-24). Antes da homologação é preciso reconciliar com a versão vigente e registrar `effectiveFrom`/`sourceStatus` por tabela, como já é feito no pack Indonésia.

### B4. Salário mínimo regional só NCR
`regions` tem apenas NCR; empregados fora da Região Capital são avaliados contra o piso errado pela regra `PH-DOLE-MINWAGE` e pela heurística `PH-WO-NCR-MINWAGE`. Ação: tabela por região com o Wage Order de cada uma, código de região no `country_metadata`, e regra que marca `needs_review` quando a região não está declarada — em vez de aprovar/reprovar contra NCR.

### B5. Três regras que nunca falham
`PH-ART297-TWIN-NOTICE`, `PH-LA0620-FINALPAY` e `PH-COE-3DAYS` retornam sempre `passed: true` com peso 10/10/4, inflando o score de conformidade em 24 pontos. Ação: ligá-las aos dados reais de `employee_separations` ou removê-las do escopo por empregado.

### B6. Sem jornada/horas extras
O pack não implementa a capacidade `overtime` (adicional noturno, feriado, descanso semanal, prêmio de hora extra), que é parte do cálculo legal da folha filipina e também da base do 13º. Hoje isso simplesmente não existe e o 13º cai no `fallbackToMonthly`. Ação: decidir se `overtime` entra no escopo de homologação ou se fica declarado explicitamente como fora de escopo (sem módulo de ponto).

## Lacunas de produto (não bloqueiam o cálculo, bloqueiam a venda)

- **Sem landing pública PH.** A Indonésia tem `/id`; as Filipinas só têm `/packs/ph`, sem página de mercado local, e o domínio local aparece como texto.
- **Calculadora pública bloqueada** por desenho: `hasCalculator()` exige tier Production, que exige `commercialReady`. Destrava sozinha quando B1–B3 fecharem.
- **Formulário de funcionário** mostra os campos de identificação a partir do pack ativo, mas a lista de religião e o rascunho inicial ainda nascem com campos indonésios (`nik`, `npwp`, `bpjs_*`) — precisa nascer vazio conforme o pack ativo.
- **Tela de rescisão** monta o painel detalhado apenas para a Indonésia (`IdSeparationPanel`); PH usa o caminho genérico, sem Twin Notice, COE nem prazo de 30 dias na interface.
- **Idioma**: o manifesto declara só `en` (correto), mas `/packs/ph` escolhe "a primeira língua não-inglesa" e acaba em inglês por acidente — deixar explícito.

## Ordem de execução sugerida

1. B5 (score honesto) e o rascunho do formulário de funcionário — baratos e independentes.
2. B4 (salários regionais) com `needs_review` por região ausente.
3. B3 → B2 (vigência e dossiê de evidência), que são pré-requisito formal da ADR-0036.
4. B1 (piloto real) e então o flip de `commercialReady` com novo `rulesetVersion` e nova assinatura.
5. Decisão sobre B6 (jornada) e, em paralelo, painel de rescisão PH e landing pública.

## Notas técnicas

Arquivos no escopo: `src/packs/philippines/{params.ts,index.ts,signature.ts}`, `engines/{leave,separation,identifiers}.ts`, `src/routes/_authenticated/{employees,separations}.tsx`, `src/routes/packs.$country.tsx`, `docs/tech-debt.md` (DEBT-022), `docs/adr/ADR-0036-ph-statutory-tables.md`, `scripts/sign-ph.ts`. Qualquer mudança em `params.ts` exige bump de `PH_PARAMS.version` + `rulesetVersion` e nova assinatura dupla (`scripts/sign-ph.ts` + chaves na trust store).

Nada em `classify()`, no SDK ou no Core precisa mudar: o portão de `commercialReady` já funciona como projetado.

## Próximo passo

Esta entrega é a auditoria. Diga quais itens entram no próximo sprint (sugiro B5 + B4 + rascunho do formulário) e eu monto o plano de execução detalhado.
