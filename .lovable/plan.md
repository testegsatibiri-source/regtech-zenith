
# Philippines Country Pack — Validação Arquitetural (v2)

**Objetivo:** provar isolamento total do Core construindo o PH pack **sem tocar em nada fora de `src/packs/philippines/`**.

## Regra dura de Core-freeze

**Zero edits** em qualquer arquivo fora de `src/packs/philippines/` e `src/sdk/testkit/fixtures/PH.ts`. Explicitamente proibido tocar:

- `src/sdk/**` — contratos, runtime, validator, testkit (exceto fixtures novas)
- `src/lib/**` — engines, bridges, functions, i18n, obligations
- `src/routes/**` — rotas, APIs, UI
- `src/integrations/**`, `src/components/**`, `src/hooks/**`

**Única exceção permitida:** uma linha em `src/sdk/bootstrap.ts`:
```ts
CountryRuntime.tryInstall(philippinesPack);
```
(mecanismo de registro já previsto pela arquitetura — não conta como mudança de Core).

Se durante a implementação surgir necessidade de editar qualquer outro arquivo → **PARO, registro em `docs/tech-debt.md` como DEBT-018+, e reporto**. Não corrijo no mesmo sprint.

## Escopo do pack (PH v0.1.0, ruleset `PH-2024.1`)

| Capability | Regra |
|---|---|
| `tax` | BIR Withholding (TRAIN Law, tabela mensal 2023+) |
| `benefits` | SSS (MSC 2024, 14% total), PhilHealth (5%, split 50/50), Pag-IBIG (2%/2%, cap ₱200) |
| `thirteenth` | PD 851 — 13th month pay pro-rata |
| `payroll` | Compõe tax+benefits+13th **via `ctx.siblings`** (prova ADR-0003) |
| `calendar` | BIR 1601-C mensal, SSS/PhilHealth/Pag-IBIG mensal, BIR 2316 e Alphalist anuais |
| `contracts` | Labor Code Art. 296: probation ≤ 6 meses, regularização automática |
| `rules` | Salário mínimo NCR (₱610/dia default via params), 13th obrigatório |
| `audit` | Heurística OT Art. 87 |

## Estrutura (só sob `src/packs/philippines/`)

```text
src/packs/philippines/
├── index.ts                    # CountryPack export + manifest + health()
├── params.ts                   # PH_PARAMS: BIR brackets, tabela SSS, tetos
├── engines/
│   ├── tax.ts
│   ├── benefits.ts
│   ├── thirteenth.ts
│   ├── payroll.ts              # usa ctx.siblings
│   ├── contracts.ts
│   └── calendar.ts
└── __tests__/
    ├── conformance.test.ts     # 4 suites do testkit + fixtures PH
    └── coexistence.test.ts     # ver abaixo
```

Fixtures PH em novo arquivo `src/sdk/testkit/fixtures/PH.ts` (não edita `ID.ts` nem `index.ts` do testkit — importadas diretamente por path no teste).

## Teste de coexistência (novo)

`src/packs/philippines/__tests__/coexistence.test.ts` prova **ausência de estado global compartilhado**:

1. `bootstrapPacks()` — ID + MY + PH instalados na mesma instância.
2. Runtime lista os 3; nenhum degrada os outros.
3. **Interleave sequence:**
   ```
   ID.tax → PH.tax → ID.tax (mesmo input → mesmo output)
   ID.payroll → PH.payroll → ID.payroll (idem)
   MY.health() (stub warn) sem afetar ID/PH
   ```
4. Assert: outputs de ID são bit-idênticos entre a 1ª e 3ª chamada, mesmo intercalados com PH.
5. Assert: `CountryRuntime.contextFor("PH").siblings` não vaza providers de ID.

## Métricas do relatório final

Tabela obrigatória no fim:

| Métrica | Resultado |
|---|---|
| Arquivos do Core alterados | 0 (meta) |
| Arquivos do SDK alterados | 0 (meta; fixture PH conta como pack) |
| Arquivos Runtime alterados | 0 (meta) |
| Arquivos do Country Pack criados | N |
| Linha única em bootstrap.ts | 1 (exceção prevista) |
| Débitos registrados | X |
| Bloqueadores | X |
| Conformance PH | pass/fail |
| Coexistence test | pass/fail |

Contagem via `git diff --stat` reportada literalmente.

## Débitos pré-registrados (não corrigidos nessa sprint)

- **DEBT-018 — Public API multi-country.** Endpoints `/api/public/v1/calculate-*` seguem ID-only. Correto adiar até haver cliente PH real de API.
- **DEBT-019+** — qualquer atrito descoberto durante PH (ex.: `getLegacyPack` hardcoded, campos ID-only em contexto compartilhado, i18n sem `en-PH`).

## Detalhes técnicos-chave

- **BIR TRAIN monthly:** 0 / ₱20,833 / ₱33,333 / ₱66,667 / ₱166,667 / ₱666,667 → 0/15/20/25/30/35% sobre excedente + fixo por faixa.
- **SSS 2024:** MSC ₱4k–₱30k, 14% total (EE 4.5% / ER 9.5% + EC ₱10–30).
- **PhilHealth 2024:** 5%, split 2.5%/2.5%, floor ₱10k / cap ₱100k.
- **Pag-IBIG:** 2%/2% cap ₱200 cada lado.
- **13th:** `basicSalaryYTD / 12`, pro-rata, deadline 24/dez.
- **Payroll compõe via `ctx.siblings`** — chamada sem `ctx` deve funcionar (fallback), com `ctx` prova o DI.

## Critérios de sucesso

1. `bunx tsgo --noEmit` verde.
2. `bun test src/packs/` — ID (13) + PH conformance + PH coexistence todos verdes.
3. `/country-packs` mostra 3 packs (ID installed, MY degraded, PH installed).
4. `git diff --stat` fora de `src/packs/philippines/` e `src/sdk/testkit/fixtures/PH.ts` = **apenas 1 linha em `src/sdk/bootstrap.ts`**.
5. Relatório final com tabela de métricas + lista de débitos.

## Fora de escopo
- UI dedicada PH, endpoints PH, feriados móveis, marketplace/lifecycle H7, i18n PH.
