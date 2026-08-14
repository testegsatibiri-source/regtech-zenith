# Auditoria do Country Pack Filipinas + caminho para integração com órgãos do governo

## Parte 1 — Estado atual (verificado)

O pack está instalado no runtime (`CountryRuntime.tryInstall(philippinesPack)`), valida sem erros, `health()` retorna `ok`, e as 4 suítes de teste do pack passam (31 testes).

Funcionalidades declaradas no manifesto: payroll, tax, benefits, thirteenth, calendar, contracts, audit, rules — todas têm implementação real (não há capability declarada sem código).

O que está operando corretamente:
- Tax (BIR TRAIN mensal) com lookup por `floor`, cobrindo os buracos de 1 peso da tabela publicada.
- Benefícios SSS / PhilHealth / Pag-IBIG com pisos e tetos.
- 13º mês (PD 851) pró-rata por meses de serviço.
- Contratos: limite de probação de 6 meses e regularização automática (Art. 296).
- Calendário: 6 obrigações (BIR 1601-C, SSS R-5, PhilHealth RF-1, Pag-IBIG MCRF, BIR 2316, 1604-C) com ocorrências mensais/anuais.
- Regras e heurísticas de auditoria ligadas ao Compliance Score (salário mínimo NCR, elegibilidade 13º).
- Assinatura dupla Ed25519 cobrindo `commercialReady`.

## Parte 2 — Lacunas encontradas (o que impede o "payroll-ready")

Fiscais (bloqueiam uso comercial — `commercialReady: false` está correto hoje):
1. SSS usa clamp simplificado da MSC em vez da tabela escalonada real (RA 11199) — contribuição diverge para quase todas as faixas.
2. 13º mês calcula sobre o salário mensal atual, não sobre o total efetivamente ganho no ano dividido por 12 (base legal correta do PD 851).
3. Falta a isenção de ₱90.000 para 13º mês e outros benefícios no motor de imposto.
4. Sem tratamento de de minimis benefits, nem taxa diária/semanal/quinzenal (só mensal).
5. Salário mínimo fixo em NCR — as demais regiões têm Wage Orders próprios.

Operacionais:
6. Datas do calendário não ajustam para fim de semana/feriado, e os prazos de SSS/PhilHealth dependem do dígito final do employer number — hoje é um dia fixo.
7. `period_end` mensal é sempre dia 28 (deveria ser o último dia real do mês).
8. Sem feriados nacionais PH (regular/special non-working), necessários para holiday pay e para o cálculo de prazos.
9. Sem overtime/night differential/holiday premium — heurística correspondente foi removida por não ter dados de ponto.
10. Sem registro de identificadores estatutários por funcionário (TIN, SSS nº, PhilHealth nº, Pag-IBIG MID) — pré-requisito absoluto de qualquer submissão.

## Parte 3 — O que falta para conectar aos órgãos fiscalizadores

Realidade das Filipinas: BIR, SSS, PhilHealth e Pag-IBIG **não oferecem APIs REST públicas** para empregadores. A submissão real acontece por (a) portais web com upload de arquivo em formato fixo, e (b) parceiros credenciados. Portanto a integração é construída em duas camadas:

Camada A — Geração de arquivos oficiais (viável 100% dentro do produto):
- BIR: Alphalist DAT (1604-C, Schedules 7.1/7.3) e 1601-C via eBIRForms; certificado 2316 em PDF por funcionário.
- SSS: arquivo de contribuições R-3 / eR3 (layout texto) e R-5 de pagamento.
- PhilHealth: RF-1 / EPRS (CSV do employer remittance).
- Pag-IBIG: MCRF (layout de remessa mensal).

Camada B — Transmissão:
- eFPS (BIR) e portais SSS/PhilHealth/Pag-IBIG são web, sem API — o modelo suportável é "gerar arquivo + registrar comprovante de submissão" (upload do recibo, com trilha de auditoria).
- Onde existe API é via terceiros credenciados (bancos AAB para pagamento, provedores e-invoicing/EIS). Isso exige contrato comercial e credenciais — não pode ser resolvido só em código.

O que precisa existir no sistema antes de qualquer uma dessas integrações:
- Cadastro de dados do empregador (TIN + branch code, RDO, SSS/PhilHealth/Pag-IBIG employer numbers).
- Identificadores estatutários por funcionário validados por formato.
- Motor de payroll com valores fiscalmente corretos (Parte 2 itens 1–4) — enviar valor errado ao BIR é pior que não enviar.
- Um contrato `FilingProvider` no SDK (novo provider opcional): `forms()`, `generate(period)` retornando artefato + checksum, e status de submissão persistido.

## Parte 4 — Plano de execução proposto

Fase 1 — Correção fiscal (pré-requisito de tudo)
- Tabela SSS escalonada real em `params.ts` + reescrita de `benefits.ts`.
- 13º mês sobre total ganho no ano / 12.
- Isenção de ₱90k e de minimis no motor de imposto.
- Testes de fronteira contra as tabelas publicadas.

Fase 2 — Dados estatutários
- Campos de empregador e de funcionário (TIN, SSS, PhilHealth, Pag-IBIG) com validação de formato e regra de compliance "identificadores completos".

Fase 3 — Precisão do calendário
- Último dia real do mês, ajuste de fim de semana, feriados PH, prazos por dígito final do employer number.

Fase 4 — Camada de filings
- Novo `FilingProvider` no SDK (capability opcional, sem quebrar interface v1).
- Geradores PH: 1601-C, Alphalist 1604-C DAT, 2316 PDF, SSS R-3, PhilHealth RF-1, Pag-IBIG MCRF.
- Tela de Filings: gerar, baixar, marcar como submetido, anexar comprovante, trilha de auditoria.

Fase 5 — Promoção comercial
- Reavaliar `commercialReady` do pack PH somente após Fases 1–2, com evidência documental (ADR-0035 / release checklist).

## Notas técnicas

Arquivos envolvidos: `src/packs/philippines/params.ts`, `engines/benefits.ts`, `engines/tax.ts`, `engines/thirteenth.ts`, `engines/calendar.ts`, `index.ts`, novo `engines/filings/*`; `src/sdk/providers/FilingProvider.ts` + export no `src/sdk/index.ts`; migração para colunas de identificadores estatutários e tabela de filings; nova rota autenticada de Filings. Nenhuma mudança em Core além do novo provider opcional e da migração.
