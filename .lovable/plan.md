# H24 — PH Statutory Evidence & Table Validity

Sprint puramente documental e de dados no pack Filipinas. Nenhuma mudança em `classify()`, manifesto, assinatura ou lógica de cálculo.

Base: a auditoria do pack PH (v1.6.0, `PH-2024.6`, `commercialReady: false`) mostrou que os motores fiscais estão corretos, mas as tabelas estatutárias estão rotuladas apenas em comentário, sem vigência declarada nem evidência publicada.

Os seis pontos da revisão de auditoria foram acatados e estão refletidos abaixo.

## B3 — Vigência das tabelas

**Metadados por tabela em `src/packs/philippines/params.ts`**, no padrão do pack Indonésia (`source` / `effectiveFrom` / `sourceStatus`):

| Tabela | Fonte citada hoje |
|---|---|
| SSS MSC escalonada | SSS Circular 2024-004 |
| PhilHealth (5%, piso 10k, teto 100k) | PhilHealth Circular 2023-0027 |
| BIR retenção mensal + teto ₱90k | RA 10963 (TRAIN) / RR 11-2018 |
| Salário mínimo regional (hoje só NCR) | DOLE Wage Order NCR-24 |
| Pag-IBIG (2%, teto ₱200) | HDMF Contribution Schedule 2024 |

**"official" é consequência da evidência, não rótulo antecipado.** Toda tabela nasce `sourceStatus: "needs-review"` e só pode virar `"official"` quando existir o arquivo correspondente em `docs/governance/legal-opinions/` citando a fonte publicada. Confirmação feita só por consulta de engenharia não basta e não promove nada.

**Identificadores de tabela em um enum compartilhado.** Os IDs (`PH_SSS_MSC`, `PH_PHILHEALTH`, `PH_BIR_MONTHLY`, `PH_WAGE_REGIONS`, `PH_PAGIBIG`) vivem numa const única importada por `params.ts` e pelo teste, e são o que o cabeçalho do arquivo de evidência declara — nada de string livre.

**Comentário antigo é removido.** As citações de fonte que hoje existem só como comentário em `params.ts` saem; o metadado estruturado passa a ser a única fonte de verdade, para não restarem duas versões divergindo com o tempo.

**Schema já preparado para o B4, com golden test.** O salário mínimo vira um array de entradas regionais (uma entrada, NCR), cada uma com seus próprios `source`/`effectiveFrom`/`sourceStatus`. Isso **é** mudança de shape consumida por `PH-DOLE-MINWAGE` e `PH-WO-NCR-MINWAGE`: o código que lê a estrutura muda. Por isso o sprint inclui um golden test do caso NCR atual, capturado antes do refactor e comparado depois, provando comportamento observável idêntico.

**Testes de invariante** (`src/packs/philippines/__tests__/params-validity.test.ts`), três níveis:
1. Presença: toda tabela estatutária tem `source`, `effectiveFrom` e `sourceStatus`.
2. Vínculo: toda tabela `official` tem arquivo de evidência correspondente, resolvido pelo ID do enum.
3. Coerência: o `effectiveFrom` do arquivo de evidência é idêntico ao de `params.ts`, e `author` ≠ `reviewer` no cabeçalho — auto-aprovação óbvia é barrada por comparação de string (não substitui revisão humana, só impede o caso trivial).

Sem bump de `PH_PARAMS.version` nem de `rulesetVersion`: nenhum valor calculado muda. Um valor desatualizado descoberto na reconciliação vira achado com dono, nunca correção dentro deste sprint (correção de valor exige bump + re-assinatura, em sprint próprio).

## B2a — Dossiê interno de evidência (fechável neste sprint)

- Um arquivo por tabela em `docs/governance/legal-opinions/PH-<tabela>-<yyyy-mm-dd>.md`: citação da fonte publicada, data de vigência, valores transcritos, identificador da tabela e `sourceStatus` resultante.
- Atualizar a tabela de status do `docs/governance/legal-opinions/README.md` (hoje PH aparece como "Not required yet").
- **Revisão independente**: cada arquivo carrega sign-off de uma segunda pessoa, distinta de quem fez a reconciliação do B3. Sem o segundo nome, o arquivo não conta como evidência e a tabela permanece `needs-review`.
- **Requisito da contraparte jurídica definido agora** (para não repetir o lead time do pack ID): advogado licenciado nas Filipinas, com prática trabalhista e tributária, nº IBP no cabeçalho, escopo temporal de validade e gatilho de revisão — nos moldes de `docs/governance/legal-opinion-template.md`.

## B2b — Parecer jurídico externo (continua aberto)

O que este sprint entrega é transcrição de fontes com revisão interna, **não** parecer jurídico externo assinado. Em `docs/tech-debt.md`, DEBT-022 passa a listar explicitamente:

- **B3** — fechado.
- **B2a** — fechado.
- **B2b** — aberto: parecer jurídico externo obtido, assinado e versionado. Bloqueia `commercialReady` junto com **B1** (validação de layout em portal real).

`commercialReady` permanece `false`. O tech-debt precisa deixar impossível que, três sprints adiante, alguém leia "B2 concluído" e assuma que o parecer externo já existe.

## Isolamento entre packs (condição de abertura da branch)

1. **Enum de identificadores mora dentro do pack**: `src/packs/philippines/constants.ts`. Nada em `src/sdk/` nem em módulo compartilhado — colocá-lo lá seria mudança de Core/SDK disfarçada de tarefa documental e quebraria o Core-freeze.
2. **"Padrão do pack Indonésia" significa imitar a forma, nunca importar o módulo.** PH declara seu próprio tipo de metadado; é proibido importar `UmpEntry` ou qualquer coisa de `src/packs/indonesia/*`. Um teste estático barra qualquer `import ... from ".../indonesia/"` dentro de `src/packs/philippines/`.
3. **Diff aditivo nos ledgers cross-pack.** `docs/governance/legal-opinions/README.md` e `docs/tech-debt.md` são compartilhados: editar apenas a linha/seção do PH, nunca regenerar o arquivo. Diff mínimo nesses dois arquivos é critério de review.
4. **Suíte de coexistência entre packs roda obrigatoriamente**, não só `src/packs/philippines/__tests__/`. A mudança de shape do salário mínimo toca código de motor, então precisa provar que ID e MY continuam intactos coexistindo com PH.

## Fora de escopo

B5 (regras que nunca falham), B4 (salários regionais), B1 (piloto em portal real), B6 (jornada/horas extras), painel de rescisão PH e landing pública.

## Critério de aceite

- Zero tabelas sem `source`/`effectiveFrom`/`sourceStatus`, garantido por teste.
- Contagem explícita registrada no fechamento: **N/5 `official` + M/5 `needs-review`, com N + M = 5**. O sprint é aceito com qualquer N, inclusive 0 — desde que cada `needs-review` tenha um ticket nomeado com dono, não uma nota solta.
- Toda tabela `official` tem arquivo de evidência com `effectiveFrom` idêntico ao do código e `author` ≠ `reviewer`, verificado por teste.
- DEBT-022 atualizado com B3/B2a fechados e B2b/B1 abertos; `commercialReady` intocado.
- **Zero mudança de valor calculado** (não "zero mudança em motor"): o shape do salário mínimo muda e o código que o lê é ajustado, com golden test do caso NCR provando resultado idêntico.
- Zero alteração em `classify()`, manifesto ou bloco de assinatura; typecheck e suíte completa verdes.
