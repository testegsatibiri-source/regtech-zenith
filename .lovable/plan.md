# Fase C — Rescisão indonésia: pesangon, UPMK, UPH e regime PKWT (PP 35/2021 + UU 6/2023 + MK 168/PUU-XXI/2023)

A Fase C é o último bloqueio interno do gate comercial do pacote indonésio (junto com o parecer jurídico da Fase D, que corre em paralelo, e o dado salarial oficial DEBT-024/025). Hoje o `SeparationProvider` só existe nas Filipinas; na Indonésia não há cálculo de rescisão nenhum — qualquer desligamento em cliente real exigiria conta manual fora do sistema.

**Baseline normativo revisado.** O PP 35/2021 deixa de ser a fonte única: o regime vigente é PP 35/2021 + UU 6/2023 + a Putusan MK 168/PUU-XXI/2023 (31/10/2024), que determina que a tabela de pesangon do art. 156(2) seja lida como *paling sedikit* (piso, não valor fechado). Consequência de arquitetura: o motor devolve `statutoryMinimum`, nunca um "valor final legal".

## O que você vai ver quando terminar

- Ao desligar um funcionário indonésio, o sistema calcula a liquidação por motivo de desligamento, separando cada verba: pesangon, uang penghargaan masa kerja (UPMK), uang penggantian hak (UPH), THR, compensação de PKWT, uang pisah e salário pendente.
- O resultado vem com memória de cálculo completa: quais leis e qual interpretação foram usadas, quais dados entraram, o que faltou e quem aprovou — auditável rupia por rupia depois do fato.
- O valor é apresentado como **mínimo legal**, não como valor final: acordos e regulamentos internos podem elevá-lo, e o sistema mostra isso explicitamente.
- Contratos temporários (PKWT) geram a compensação de fim de contrato, e passar do limite de 5 anos vira uma **violação de conformidade que bloqueia renovação e exige classificação jurídica** — não uma conversão automática para efetivo.

## Correções aceitas antes de codar (gate de implementação)

| Ponto | Decisão |
| --- | --- |
| Faixas de pesangon por tempo de serviço | Aprovado — faixa por piso |
| Faixas de UPMK | Aprovado, vetores conferidos integralmente |
| `Math.round()` sobre anos | Proibido |
| 15% moradia/tratamento médico | Removido do baseline legal |
| THR dentro do UPH | Removido — THR é componente próprio |
| Compensação PKWT | Aprovada, com vetores oficiais |
| Limite de 5 anos do PKWT | Aprovado |
| Conversão automática PKWT→PKWTT | Bloqueada até parecer jurídico |
| Matriz só de multiplicadores | Reprovada |
| Entitlement matrix por motivo | Obrigatória |
| Base = salário + tunjangan tetap (art. 157) | Aprovado |
| Trabalhador diarista / por produção | Deve entrar |
| MK 168/2023 na proveniência normativa | Obrigatório |
| Snapshot imutável do ruleset em cada rescisão | Obrigatório |
| Gate regulatório em 31/10/2026 | Obrigatório |
| `commercialReady` | Permanece `false`, com blockers estruturados |

## Etapas

1. **Checkpoint normativo (fechado, entra como fonte no código)**
   - **Fração de tempo de serviço — FECHADO.** Faixas por piso, não arredondamento: "masa kerja kurang dari 1 tahun" = 1 mês, "1 tahun atau lebih tetapi kurang dari 2 tahun" = 2 meses, e assim por diante. Nenhum `Math.round` sobre anos.
   - **Componente de 15% (perumahan/pengobatan/perawatan) — FORA DO BASELINE.** A UU 6/2023 removeu a antiga disposição do art. 156(4); o item não é regra regulatória e **não** existe como flag do pacote. Quando uma empresa oferecer benefício equivalente por PK/PP/PKB, ele entra como `contractualEntitlement`. A confirmação formal fica como item `LEGAL-VALIDATION` no resumo em `docs/governance/legal-opinions/`, sem bifurcação de regra no motor.
   - **Conversão PKWT→PKWTT — PERGUNTA EXPLÍCITA AO PARECER.** O limite de 5 anos (incluídas prorrogações) está bem fundamentado; a consequência automática de conversão vem do regime anterior e não foi confirmada no regime atual. Vai ao advogado indonésio como pergunta específica.
2. **Proveniência normativa multi-instrumento** — `legalBasis` deixa de ser string e passa a ser lista de instrumentos: `{ instrument: "PP 35/2021", articles: [...] }`, `{ instrument: "UU 6/2023", articles: ["156"] }`, `{ instrument: "MK 168/PUU-XXI/2023", decisionDate: "2024-10-31", effect: "art. 156(2) lido como direito mínimo" }`. `sourceStatus: "official"` só é válido com a lista completa. Aplica-se a cada tabela e a cada regra de motivo.
3. **Parâmetros oficiais** — `src/packs/indonesia/params/pp35-2021.ts`: tabela de pesangon por faixa (1–9 meses), tabela UPMK (2–10 meses a partir de 3 anos), componentes do UPH baseline (férias anuais não gozadas; custo de retorno ao local de contratação quando aplicável; direitos de PK/PP/PKB) e regras de base salarial do art. 157 (salário-base + tunjangan tetap; regras próprias para diarista e por produção).
4. **Entitlement matrix por motivo (substitui a matriz de multiplicadores)** — cada motivo (arts. 36–52) é uma composição de direitos, não um fator único:
   ```text
   SeparationEntitlement {
     pesangon?:  { applicable, multiplier? }
     upmk?:      { applicable, multiplier? }
     uph:        { applicable }
     uangPisah?: { applicable, source: employment_agreement | company_regulation | cba }
     additionalBenefits?
   }
   ```
   Ex.: pedido de demissão = sem pesangon, sem UPMK, com UPH e uang pisah condicional (arts. 50–52). Motivos que geram só UPH + uang pisah são de primeira classe no modelo.
5. **Base salarial tipada** — o motor não consome `baseSalary` cru; recebe `severanceWageBase { baseSalary, fixedAllowances, wageFrequency, dailyRate?, pieceRate12MonthAverage?, applicableMinimumWage? }`, com estratégia explícita por tipo de remuneração (mensal, diária, por produção). Dado ausente vira `missingInputs`, não uma suposição.
6. **Motor de rescisão ID** — `src/packs/indonesia/engines/separation.ts`. Retorna objeto de evidência, não um total: `statutoryMinimum`, `components` (pesangon, upmk, uph{unused_leave, repatriation, other_contractual_rights}, thr, pkwtCompensation, uangPisah, unpaidSalary, contractualAdjustments), `legalBasis[]`, `ruleVersion: "ID-SEPARATION-2026.1"`, `inputsSnapshot`, `calculationTrace[]`, `completeness{complete, missingInputs[]}`, `warnings[]`, `approvals[]`. THR fica **fora** do UPH, como componente irmão, para evitar dupla contagem. Extensão do `SeparationProvider` do SDK é opcional e aditiva — as Filipinas não mudam.
7. **Regime PKWT** — compensação de fim de contrato (proporcional, art. 15) com vetores oficiais; e, ao ultrapassar o máximo legal: `complianceViolation` + `requiresLegalClassification = true` + bloqueio de renovação e alerta ao RH. Nenhuma mudança automática de tipo de contrato.
8. **Gate regulatório 31/10/2026 (`REGULATORY-WATCH-ID-2026-10-31`)** — a MK determinou a separação do cluster trabalhista da UU 6/2023 em lei autônoma até 31/10/2026, com consequência jurídica (retorno à UU 13/2003 somada às decisões constitucionais) se o prazo passar sem promulgação. O ruleset carrega:
   ```text
   ruleVersion: "ID-SEPARATION-2026.1"
   effectiveFrom: "2024-10-31"
   regulatoryReviewRequiredBy: "2026-10-31"
   regulatoryStatus: { status: "time_bounded", blockingAfter: "2026-10-31",
                       reason: "MK 168/PUU-XXI/2023 legislative transition deadline" }
   ```
   Em runtime: desligamento antes de 31/10/2026 usa o ruleset normalmente; em ou após a data, se não houver ruleset novo confirmado, o cálculo retorna `BLOCKED_PENDING_REGULATORY_REVALIDATION` em vez de um valor. O pacote não atravessa a fronteira normativa em silêncio.
9. **Tela, gravação e snapshot imutável** — fluxo de desligamento com escolha do motivo, prévia componente a componente, aviso de "mínimo legal" e de dados faltantes, confirmação que grava o caso. Tabela `separation_cases` inclui, além de company_id/employee_id/motivo/datas/componentes/statutory_minimum/inputs_snapshot/calculation_trace: `ruleset_version`, `ruleset_effective_date`, `legal_basis_snapshot`, `calculation_status`, `completeness_status`, `regulatory_status`, `calculated_at`, `approved_at`, `approved_by`, `calculation_hash`. O hash cobre inputs snapshot + versão do ruleset + configuração de direitos + componentes do resultado, para detectar alteração posterior da memória de cálculo. Uma rescisão calculada em setembro **não** muda quando o pacote for atualizado em novembro — o caso permanece reproduzível.
10. **`commercialReadiness` estruturado** — o manifesto do pacote troca o booleano opaco por:
    ```text
    commercialReadiness: {
      ready: false,
      blockers: [
        "LEGAL_OPINION_ID",
        "DEBT_024_OFFICIAL_WAGE_DATA",
        "DEBT_025_OFFICIAL_WAGE_DATA"
      ],
      futureGates: [
        { id: "REGULATORY_REVALIDATION_2026_10_31", blockingFrom: "2026-10-31", status: "scheduled" }
      ]
    }
    ```
    Diferença conceitual: `blockers` são impedimentos atuais que podem ser removidos; `futureGates` são eventos normativos futuros que se tornam automaticamente bloqueantes a partir da data. O campo `commercialReady: false` continua existindo como derivado para compatibilidade. Antes de 31/10/2026, se os blockers forem resolvidos, o pacote pode ficar pronto; a partir da data, sem ruleset sucessor aprovado, o gate passa para `status: "blocking"` e o pacote volta a não liberável.
11. **Testes e conformidade** — `src/packs/indonesia/__tests__/separation.test.ts`: vetores por motivo, casos fracionários propositais (11 meses; 2 anos e 11 meses; 8 anos e 3 meses), pedido de demissão (só UPH + uang pisah), diarista e trabalhador por produção, `fixedAllowances` ausente devolvendo `complete: false`, PKWT acima do limite gerando violação sem conversão, e desligamento em/após 31/10/2026 devolvendo bloqueio regulatório. Gate local `bunx tsgo --noEmit`, `bun test`, `bunx eslint .` verdes.
12. **Governança** — ADR/release notes registram o baseline tri-instrumento, o gate temporal e as **quatro** perguntas ao parecer indonésio: (1) componente de 15%; (2) conversão PKWT→PKWTT; (3) leitura literal do art. 40(4); (4) efeito operacional sobre cálculos de rescisão e PKWT a partir de 31/10/2026 caso a lei trabalhista autônoma não tenha sido promulgada — esta exige resposta escrita.

## Fora de escopo

- Acordos coletivos acima do piso: o motor entrega `statutoryMinimum`; excedentes entram como `contractualEntitlement`/ajuste manual, nunca embutidos na regra legal.
- Fluxo de litígio no PHI (registro de mediação basta nesta fase).
- Bump de versão e reassinatura: ficam para o D7.

## Detalhes técnicos

- Arquivos novos: `src/packs/indonesia/params/pp35-2021.ts`, `src/packs/indonesia/engines/separation.ts`, `src/packs/indonesia/__tests__/separation.test.ts`, função de servidor de desligamento ID, migração `separation_cases`.
- Arquivos tocados: `src/sdk/providers/SeparationProvider.ts` (extensão opcional aditiva), `src/lib/engines/id-pack.ts`, `src/lib/engines/contracts.ts` (violação PKWT), telas de funcionários/contratos, `src/packs/indonesia/index.ts` (`rulesetVersion` sobe; `commercialReady` segue `false`).
- Migração `separation_cases`: CREATE TABLE → GRANT authenticated/service_role → ENABLE RLS → policies por dono da empresa (`owns_company`) → trigger updated_at. Forward-only, aplicação deliberada.
- Sem `VITE_` em segredos; sem dependências Node-only; tudo roda no runtime atual.
