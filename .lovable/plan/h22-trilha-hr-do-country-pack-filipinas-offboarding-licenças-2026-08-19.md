# H22 — Trilha HR do Country Pack Filipinas (offboarding, licenças, 201 File)

## Estado verificado

- `src/packs/philippines/engines/` hoje contém: `tax`, `benefits`, `thirteenth`, `payroll`, `contracts`, `calendar`, `deadlines`, `identifiers`, `filings/`. Não existe nenhum motor de licenças, desligamento ou final pay — a auditoria está correta nesse ponto.
- As Fases 2–4 do plano anterior (identificadores estatutários, prazos escalonados, filing exports) **já foram entregues**: `identifiers.ts`, `deadlines.ts`, `engines/filings/*`, tabela `statutory_filings`, rota `/filings`. Então a trilha HR não corre "em paralelo à Fase 2" — ela é a próxima frente, e C pode ser a primeira fase dela.
- O SDK já declara `leave` em `CAPABILITIES` (`src/sdk/Capability.ts`) sem nenhum provider correspondente — o slot existe e está vazio.
- A tabela `employees` tem `marital_status` e `country_metadata jsonb`, mas não há dependentes, histórico de cargo/salário nem dossiê documental.

## Sequenciamento proposto

Concordo com a priorização por risco jurídico. Ordem:

**Fase A — Offboarding e Final Pay (C.1–C.4)** — maior exposição, entra primeiro.
**Fase B — Licenças estatutárias (A)** — maternidade/paternidade primeiro, depois SIL e as demais.
**Fase C — 201 File, dependentes e histórico (B)** — infraestrutura para o resto.
**Fase D — DOLE reports (F)** e **Fase E — ESS (G)** — paridade de mercado.
**Transversal — Data Privacy Act (E)** — avaliação documental + controles, roda desde a Fase A.

Time & Attendance (D) permanece fora: overtime/night diff/rest day dependem de um módulo de ponto que não existe e não deve ser simulado com dados fictícios (mesmo gate aplicado na Fase 3 do H21).

---

## Fase A — Offboarding e Final Pay

Novo provider no SDK (capability opcional, sem quebrar a interface v1):

`SeparationProvider`:
- `grounds()` — catálogo de causas (just cause Art. 297, authorized cause Art. 298 redundância/retrenchment/fechamento, Art. 299 doença), cada uma com fórmula de separation pay e requisitos processuais.
- `computeSeparationPay(input)` — 1 mês/ano vs 1/2 mês/ano conforme o artigo, com piso de 1 mês.
- `computeFinalPay(input)` — consolida: salário pró-rata do período, 13º pró-rata (base PD 851 já implementada), SIL não usada convertida, separation pay quando devido, deduções pendentes; carimba prazo de 30 dias (DOLE LA 06-20).
- `processRequirements(ground)` — Twin Notice: NTE (notice to explain, mínimo 5 dias corridos para resposta), audiência, notice of decision; para authorized cause, notificação a empregado e DOLE com 30 dias de antecedência.

Documentos gerados (reutilizando as primitivas de `engines/filings/layouts.ts`):
- Notice to Explain, Notice of Decision, Certificate of Employment (COE, prazo de 3 dias úteis), Final Pay Computation Sheet — todos com `rulesetVersion` + checksum, mesmo padrão de imutabilidade do DEBT-023.

Dados: nova tabela `employee_separations` (empresa, funcionário, causa, datas de notificação, status do fluxo twin-notice, final pay calculado, prazos) com RLS + GRANTs, e tabela `hr_documents` para os artefatos gerados.

Boundary test obrigatório: `computeFinalPay()` deve aceitar `leaveAccrual: null` (LeaveProvider ainda não implementado) e **sinalizar incompletude** (`complete: false`, item `missingLeaveProvider`) em vez de retornar um valor final. Após a Fase B, o teste oposto garante que SIL não usada apareça no cálculo. Isso evita o erro sistemático silencioso que o H20 corrigiu no payroll fiscal.

Compliance/audit: novas regras no `RuleProvider`/`AuditProvider` do pack — `PH-ART297-TWIN-NOTICE` (desligamento por just cause sem as duas notificações registradas), `PH-LA0620-FINALPAY` (final pay em aberto além de 30 dias), `PH-COE-3DAYS`.

UI: rota autenticada `/separations` — abrir desligamento, conduzir o fluxo twin-notice com prazos, calcular e liberar final pay, baixar COE.

## Fase B — Licenças estatutárias

`LeaveProvider` preenchendo a capability `leave` já declarada:
- Tipos com base legal e regra própria: SIL (Art. 95, 5 dias após 1 ano, convertível), Maternidade (RA 11210, 105/120 dias + transferência de até 7 dias), Paternidade (RA 8187, 7 dias, 4 primeiros filhos), Solo Parent (RA 8972, 7 dias, exige Solo Parent ID), VAWC (RA 9262, 10 dias), Gynecological (RA 9710, até 2 meses a cada 12).
- `entitlement(employee, year)` — elegibilidade e saldo por tipo.
- `accrual` e `conversion` — só SIL converte em dinheiro; maternidade/paternidade não.
- Maternidade: cálculo do **Salary Differential** a cargo do empregador (diferença entre o benefício SSS e o salário integral), que entra no payroll como custo do empregador.

Dados: `leave_types` (derivado do pack, não hardcoded no Core), `leave_balances`, `leave_requests` com RLS + GRANTs.

Integração com payroll: SIL não usada vira passivo e entra no final pay; salary differential de maternidade entra no `employerCost` do payslip; licenças não remuneradas reduzem a base.

## Fase C — 201 File, dependentes e histórico

- `employee_dependents` (nome, relação, data de nascimento, PWD/estudante) — pré-requisito real para dependentes em benefícios SSS/PhilHealth.
- `employee_job_history` (cargo, salário, data efetiva, motivo) — auditável, alimenta final pay e regularização.
- Campo `solo_parent` (com ID e validade) e revisão de `marital_status`, ambos consumidos pelas regras de licença.
- 201 File: agrupamento por funcionário de contratos, avaliações, ações disciplinares e documentos, com checklist de completude virando heurística de auditoria (`PH-201-FILE`).

## Fase D — Relatórios DOLE

- RKS Form 5 / 5-B (Establishment Report) como novo form no `FilingProvider` do pack.
- Relatório de desligamento coletivo (retrenchment/redundancy) ao DOLE Regional Office, disparado pela Fase A quando o número de desligamentos por authorized cause cruzar o limiar.
- Ambos entram no calendário de obrigações existente.

## Fase E — ESS

Portal do funcionário: contracheque, solicitação de licença (consumindo a Fase B), atualização de dados pessoais com trilha de aprovação. Depende de papéis de usuário por funcionário — escopo separado, avaliado ao final.

## Transversal — Data Privacy Act (RA 10173)

Entrega documental + controles, sem esperar as fases:
- `docs/governance/ADR-00XX-data-privacy-ph.md`: papéis PIC/PIP, base legal de cada categoria de dado (TIN, SSS, PhilHealth, dados de saúde ligados a licença médica), retenção e proporcionalidade.
- Registro de Processing Activities e checklist de registro na NPC (ação do cliente, não do código).
- Direitos do titular: exportação e correção de dados do funcionário; acesso a dados sensíveis (saúde/licença) restrito por capability, não por papel genérico de admin.
- Log de acesso a dados sensíveis no `platform_audit_log`.

## Governança

Cada fase que alterar comportamento estatutário do pack bumpa `rulesetVersion` e exige **re-assinatura Ed25519** — o teste de adulteração (`src/packs/__tests__/signature-tamper.test.ts`) já bloqueia bump sem re-assinatura. `commercialReady` do pack PH continua `false` até, no mínimo, o fim da Fase A + Fase B (maternidade/paternidade), com evidência em ADR e release checklist. **Nota de release**: `commercialReady=true` não cobre o cadastro de dependentes (Fase C), que continua sendo pré-requisito parcial da isenção fiscal por dependente. A documentação de release deve listar essa limitação explicitamente até a Fase C fechar.

## Notas técnicas

Novos arquivos: `src/sdk/providers/SeparationProvider.ts`, `src/sdk/providers/LeaveProvider.ts` (+ export em `src/sdk/index.ts`, slots em `CountryPack.ts`, `validator.ts`, `interfaces.ts`); `src/packs/philippines/engines/separation/*`, `engines/leave/*`, novos params em `params.ts` (fórmulas Art. 298/299, tabelas de licença). Core: migrações para `employee_separations`, `hr_documents`, `leave_*`, `employee_dependents`, `employee_job_history` (todas com RLS + GRANTs), server functions em `src/lib/separations.functions.ts` e `src/lib/leave.functions.ts`, rotas `/separations` e `/leave` sob `_authenticated`. Nenhuma mudança em Core além dos dois providers opcionais e das migrações.
