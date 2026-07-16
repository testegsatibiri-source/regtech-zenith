## Diagnóstico: onde o UBoard Asia está hoje

Mapeando o código real contra o roadmap proposto:

**Já entregue (Sprints 1–3 + parte da 4 e 10):**
- Core multi-tenant: `companies`, `branches`, `employees` (com `country_metadata` JSONB), `profiles`, `user_roles` com `has_role()` — ✅ base pronta para multi-país.
- **Rule Engines Indonésia**: PPh 21 TER (PP 58/2023), BPJS (Kesehatan/JHT/JP/JKK/JKM com tetos), THR — ✅ Sprint 3 concluído.
- **Compliance Score** (`evaluateCompany` + `ScoreGauge`, 6 validadores ponderados) — ✅ Sprint 4 concluído.
- **Dashboard** com findings priorizados — ✅ Sprint 5 concluído.
- **Payroll runs + items** persistidos, execução mensal — ✅ núcleo funcional.
- **AI Audit preditiva** (`/audit`) com estatística + narrativa via Lovable AI — ✅ Sprint 10 antecipado.
- **API-as-a-Service** pública: `/api/public/calculate-tax`, `/calculate-bpjs`, `/openapi.json` + Swagger UI — ✅ monetização secundária pronta.
- Autenticação (Email + Google), i18n EN/ID, landing comercial.

**Ainda não existe:** Calendar de obrigações, Contratos, Employee Portal, Visa, ciclos ≠ mensal, Time & Attendance, Lifecycle/Offboarding.

## Análise da sua proposta de sequenciamento

Sua ordenação está **arquiteturalmente correta** em quase tudo. Três pontos merecem refinamento:

### Onde concordo integralmente
- **Payroll Cycles, Time & Attendance e Offboarding depois do núcleo**: correto. Nenhum é pré-requisito para validar o Compliance OS. Antecipá-los infla escopo e adia contato com cliente pagante.
- **Time & Attendance como produto separado** consumido pelo Payroll: essa fronteira arquitetural é a decisão certa. Acoplar ponto ao Payroll cria o mesmo problema técnico que SAP tem hoje.
- **Offboarding depois de Contratos**: dependência real; sem contrato estruturado o cálculo rescisório é heurística.

### Onde eu ajustaria

**1. Calendar antes de Contratos (Sprint 6 mantido, mas com escopo diferente).**
Você não precisa esperar "Obligations" existirem como entidade rica. O Calendar mínimo viável é uma tabela `compliance_obligations` seedada por Country Pack (datas de PPh 21, SPT Masa, BPJS, THR, laporan tenaga kerja) + dispatcher de alertas. Isso destrava demonstração comercial em 1 sprint e alimenta o Compliance Score com uma dimensão temporal ("você tem 3 obrigações vencendo em 7 dias").

**2. Employee Portal (Sprint 8) tem valor comercial mais alto do que "média".**
Na Indonésia, o portal é o que reduz o custo de suporte do RH cliente (holerite digital, solicitação de THR, dados cadastrais). Ele também é o canal natural para coleta de NIK/NPWP faltantes — que hoje derrubam o Compliance Score. Eu o classificaria como **Alta**, não Média, mas manteria no Sprint 8.

**3. IA (Sprint 10) já parcialmente entregue.**
O `/audit` que rodamos hoje cobre a parte de auditoria preditiva. O que resta da "camada IA" é: (a) explicação em linguagem natural de findings individuais, (b) recomendação automática de correção de cadastro, (c) chatbot regulatório sobre a base de conhecimento dos Country Packs. Isso pode virar Sprint 10 mais leve, ou ser dissolvido em melhorias transversais.

### Risco de atraso na validação do Compliance OS

Os três módulos "depois" (Cycles, T&A, Lifecycle) têm padrão comum: **cada um sozinho é um mini-produto de 4–8 semanas**. Colocar qualquer um deles antes do Sprint 10 empurra o primeiro cliente pagante em 2–3 meses sem melhorar a proposta de valor central ("evite autuação da Kemenaker/DJP"). Manter a ordem que você propôs preserva o time-to-market.

## Roadmap validado

| # | Sprint | Escopo mínimo | Status |
|---|---|---|---|
| 3 | THR Engine | Calendário lunar + trigger 15/7 dias antes do Eid | ✅ feito |
| 4 | Compliance Score | Validadores ponderados + gauge | ✅ feito |
| 5 | Dashboard | Findings priorizados + stats | ✅ feito |
| 6 | **Regulatory Calendar** | `compliance_obligations` seedadas por Country Pack + alertas + integração ao Score | Próximo |
| 7 | Contratos | PKWT/PKWTT, cláusulas, versionamento, expiração alimenta Score | |
| 8 | Employee Portal (Alta) | Holerite, dados cadastrais self-service, coleta de NIK/NPWP | |
| 9 | Visa / Expat | KITAS, IMTA, expiração no Calendar, PPh 26 | |
| 10 | IA — completar | Explicação de findings, correção sugerida, chatbot regulatório (auditoria já feita) | Parcial |
| 11 | Payroll Cycles | `payroll_periods` polimórfico (mensal/quinzenal/semanal/diário), fechamento parcial | |
| 12 | Time & Attendance | Módulo independente com API contract publicado; Payroll consome eventos | |
| 13 | Employment Lifecycle | Onboarding, movimentações, offboarding, cálculo final, obrigações pós-desligamento | |

## Marco de validação comercial

Sugiro tratar **fim do Sprint 9** como o "GA do Compliance OS" — é o ponto onde:
- Fechamento mensal está completo (Payroll + Compliance + Calendar + Contratos + Portal + Expat).
- Todas as fontes de risco de autuação indonésias mais comuns estão cobertas.
- Sprints 10–13 viram melhorias, não bloqueios.

## Próximo passo sugerido

Iniciar **Sprint 6 — Regulatory Calendar**: (1) migração `compliance_obligations` + `obligation_events`, (2) seed do Indonesia Country Pack (PPh 21 masa, SPT Tahunan, BPJS, THR, LKPM), (3) rota `/calendar` com timeline e alertas, (4) integrar contagem "obrigações em risco" ao Compliance Score global.

Confirme se quer que eu execute o Sprint 6 nessa ordem, ou se prefere reordenar algo antes de eu partir para implementação.
