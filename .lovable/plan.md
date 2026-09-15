# H24 — PH Statutory Evidence & Table Validity

Sprint puramente documental e de dados no pack Filipinas. Nenhuma mudança em `classify()`, manifesto, assinatura ou lógica de cálculo.

Base: a auditoria do pack PH (v1.6.0, `PH-2024.6`, `commercialReady: false`) mostrou que os motores fiscais estão corretos, mas as tabelas estatutárias estão rotuladas apenas em comentário, sem vigência declarada nem evidência publicada.

## B3 — Vigência das tabelas (primeiro)

**Metadados por tabela em `src/packs/philippines/params.ts`**, no mesmo padrão do pack Indonésia (`UmpEntry.sourceStatus` / `effectiveYear`):

| Tabela | Fonte citada hoje |
|---|---|
| SSS MSC escalonada | SSS Circular 2024-004 |
| PhilHealth (5%, piso 10k, teto 100k) | PhilHealth Circular 2023-0027 |
| BIR retenção mensal + teto ₱90k | RA 10963 (TRAIN) / RR 11-2018 |
| Salário mínimo NCR (₱610/dia) | DOLE Wage Order NCR-24 |
| Pag-IBIG (2%, teto ₱200) | HDMF Contribution Schedule 2024 |

Cada uma ganha `source`, `effectiveFrom` e `sourceStatus` (`"official" | "needs-review" | "stale"`), passando a ser dado e não comentário.

**Reconciliação**: verificar se o valor de 2024 ainda é o vigente. Onde não houver confirmação, marcar `sourceStatus: "needs-review"` — nunca assumir vigência, mesmo critério do DEBT-024/025 no pack ID.

**Teste novo** (`src/packs/philippines/__tests__/params-validity.test.ts`): invariante que percorre o catálogo de tabelas estatutárias do pack e falha se qualquer uma estiver sem `effectiveFrom` ou `sourceStatus`. Uma tabela nova sem metadado quebra a suíte.

Sem bump de `PH_PARAMS.version` nem de `rulesetVersion`: nenhum valor de cálculo muda. Se a reconciliação descobrir um valor desatualizado, isso vira um achado registrado, não uma correção dentro deste sprint (correção de valor exige bump + re-assinatura e entra em sprint próprio).

## B2 — Dossiê de evidência (ADR-0036)

**Um arquivo por tabela** em `docs/governance/legal-opinions/PH-<tabela>-<yyyy-mm-dd>.md`, contendo: citação da fonte publicada, data de vigência (a mesma do B3), valores transcritos, e o `sourceStatus` resultante. Atualizar a tabela de status do `docs/governance/legal-opinions/README.md`, hoje com PH como "Not required yet".

**Requisito de contraparte jurídica definido agora** (para não repetir o lead time que quase atrasou a Indonésia): advogado licenciado nas Filipinas, com prática em direito trabalhista e tributário, nº de registro IBP no cabeçalho do artefato, escopo temporal de validade e gatilho de revisão — nos moldes de `docs/governance/legal-opinion-template.md`.

**`docs/tech-debt.md` (DEBT-022)**: registrar B3 e B2 como fechados, mantendo o débito aberto e `commercialReady: false`, ainda bloqueado por B1 (validação de layout em portal real).

## Fora de escopo

B5 (regras que nunca falham), B4 (salários regionais), B1 (piloto em portal real), B6 (jornada/horas extras), painel de rescisão PH e landing pública — próximos sprints, na ordem já acordada.

## Critério de aceite

- Nenhuma tabela estatutária do pack PH sem `effectiveFrom` + `sourceStatus`, garantido por teste.
- Um arquivo de evidência por tabela em `docs/governance/legal-opinions/`, com README atualizado.
- DEBT-022 atualizado; `commercialReady` intocado.
- Zero alteração em `classify()`, manifesto, bloco de assinatura ou motores de cálculo; typecheck e suíte completa verdes.
