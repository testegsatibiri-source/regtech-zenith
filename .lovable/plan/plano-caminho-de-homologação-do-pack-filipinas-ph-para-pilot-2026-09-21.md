# Plano — Caminho de homologação do pack Filipinas (PH) para piloto em cliente real

Objetivo: levar o pack PH de `commercialReady: false` (Validation) para homologado em cliente real, na ordem correta de execução — primeiro corrigir o que está errado, depois provar com evidência externa, depois validar em portal real.

## Etapa 1 — Correção das tabelas estatutárias vencidas (bump v1.7.0 / PH-2025.1)

Pré-requisito de tudo: hoje o pack calcula SSS e salário mínimo com valores superados.

1. **DEBT-030 — SSS Circular 2024-006** (vigente desde 2025-01-01): atualizar `PH_PARAMS.sss` de 14% (MSC ₱4.000–30.000) para 15% (5% EE / 10% ER), MSC ₱5.000–35.000 + faixa MPF. Atualizar a entrada `statutorySources` correspondente (effectiveFrom 2025-01-01, sourceStatus conforme evidência).
2. **DEBT-031 — Wage Order NCR-27**: atualizar `wageRegions[NCR]` de ₱610/dia (NCR-23, 2023) para ₱755/dia não-agrícola (vigente desde 2026-07-25). Avaliar NCR-28 (publicada 2026-09-11, ainda sem efeito) — registrar como pendente se aplicável.
3. **Bump e re-assinatura**: version 1.6.0 → 1.7.0, rulesetVersion PH-2024.6 → PH-2025.1, re-assinar via `scripts/sign-ph.ts` (bloco dual autor + plataforma), atualizando `signature.ts`.
4. **Re-baseline dos testes**: golden tests (`wage-golden.test.ts`, conformance) passam a travar os novos valores; o pin antigo de ₱13.420 vira registro histórico ou é substituído pelo novo boundary; `params-validity.test.ts` segue verde.
5. **Dossiê de evidência**: atualizar `PH-sss-msc-*.md` e `PH-wage-ncr-*.md` com a reconciliação (valores antigos → novos, fontes, datas), diff aditivo em `docs/tech-debt.md` fechando DEBT-030/031.

**Bloqueio desta etapa:** nenhum interno — só confirmação dos valores oficiais (fontes SSS/NWPC já identificadas nos arquivos de evidência).

## Etapa 2 — Evidência jurídica externa (B2b)

- Parecer de advogado licenciado nas Filipinas (nº IBP, escopo temporal de validade) cobrindo as 5 tabelas: SSS, PhilHealth, BIR/TRAIN, Pag-IBIG, salário mínimo NCR.
- Quando recebido, cada `sourceStatus` vira "official" e o parecer entra em `docs/governance/legal-opinions/` (sign-off duplo: author ≠ reviewer).

**Bloqueio:** externo — contratação do advogado filipino. Pode correr em paralelo com a Etapa 1.

## Etapa 3 — UI mínima para operar o piloto

O piloto precisa conseguir usar o pack sem gambiarras:

1. **Formulário de funcionário PH**: campos filipinos (TIN, SSS, PhilHealth, Pag-IBIG) no rascunho — hoje o formulário inicia com campos indonésios (nik, npwp, bpjs_*).
2. **Painel de rescisão PH**: expor o SeparationProvider na UI (hoje só existe `IdSeparationPanel` para ID), com Twin Notice, COE e final pay em 30 dias.
3. Download dos 5 arquivos de filing pela UI com checksum visível.

## Etapa 4 — Piloto em portal real (B1 — bloqueio final do gate)

- 1 empregador piloto real nas Filipinas (captação via landing /ph já publicada).
- Rodar 1 ciclo completo: folha mensal → verificar payslips contra cálculo manual → gerar os 5 filings → **upload real** nos portais BIR (eFPS/eBIRForms), SSS, PhilHealth (EPRS) e Pag-IBIG (Virtual Pag-IBIG) → registrar aceite/rejeição de cada layout.
- Cada rejeição vira ticket nomeado com dono; aceite dos 5 layouts fecha B1.
- Registrar recibos oficiais de submissão no Core (transmissão continua fora de escopo — geração apenas).

## Etapa 5 — Flip do gate

- B1 + B2b fechados → `commercialReady: true`, tier sobe para Production, bump de versão + re-assinatura.
- Landing /ph e catálogo passam a refletir o novo status automaticamente (status vem do runtime).

## Fora de escopo deste plano

- **B4** (salário mínimo das outras 16 regiões) e **B6** (jornada/horas extras — depende de módulo de T&A que não existe): ficam como débito registrado; o piloto opera com funcionários NCR e sem overtime.
- Submissão automática aos portais do governo (nenhum oferece API de empregador).
- Mudanças em Core/SDK/Runtime e nos packs ID/MY.

## Ordem e dependências

```text
Etapa 1 (tabelas + v1.7.0) ──┐
Etapa 2 (advogado, paralelo) ─┼──> Etapa 3 (UI piloto) ──> Etapa 4 (piloto real) ──> Etapa 5 (gate)
```

## Detalhes técnicos

- Arquivos da Etapa 1: `src/packs/philippines/params.ts`, `constants.ts`, `signature.ts`, `index.ts` (versões), `scripts/sign-ph.ts` (manifesto embutido), goldens em `src/packs/philippines/__tests__/`, evidências em `docs/governance/legal-opinions/PH-*.md`, `docs/tech-debt.md`.
- Etapa 3: `src/components/PayrollCalculator.tsx` / formulário de funcionário (campos por país), novo `PhSeparationPanel` espelhando o padrão de `IdSeparationPanel`, rota `_authenticated/separations.tsx`.
- Toda mudança de valor calculado exige bump de rulesetVersion + re-assinatura dual (contrato congelado interface v1.0.0).
- Verificação por etapa: `bunx tsgo --noEmit` + `bunx vitest run` verdes; Etapa 1 adiciona regressão contra a build real (`scripts/verify-bundle-packs.mjs`).

## Critério de aceite

- Etapa 1: SSS 15%/MSC ₱5.000–35.000 e NCR ₱755/dia travados por golden tests; DEBT-030/031 fechados; pack v1.7.0 assinado.
- Etapa 2: parecer externo arquivado; 5/5 tabelas "official".
- Etapa 3: piloto consegue cadastrar funcionário PH, rodar folha, desligar e baixar filings pela UI.
- Etapa 4: 5/5 layouts aceitos em upload real, com recibos registrados.
- Etapa 5: `commercialReady: true`, tier Production no catálogo e na landing.
