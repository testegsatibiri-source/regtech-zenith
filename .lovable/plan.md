# Sprint H11.1a — Indonesia Production Readiness (revisado)

Sprint curta e focada: destravar operação comercial do Indonesia Pack e fechar as lacunas Crítico/Alto da auditoria. Incorpora os 4 refinamentos: dados legais fora do código, compatibility report em publicação **e** boot, `keyId` no manifest, e teste ponta-a-ponta de payroll oficial como portão de saída.

## Objetivos de saída (Definition of Done)

1. PPh 21 correto para TER A, B e C — com tabelas vindo de parâmetros, não de constantes no engine.
2. UMP correta para qualquer província (não apenas Jakarta).
3. Calendário de THR válido para qualquer ano em uma janela pré-carregada.
4. Registry como fonte assinada: `pack_registry` populado, `pack_signing_keys` com autor + countersign, manifest do ID com `signature { keyId, algorithm, signature }`.
5. Divergência bootstrap↔registry detectada e emitida em `PackRegistryDivergence@1`.
6. `compatibility_reports` gravado **tanto na publicação quanto a cada boot**; `runtime_boot_reports` populado a cada boot.
7. Cobertura de testes: TER B/C, THR, contratos PKWT/PKWTT.
8. **Novo portão:** payroll oficial ponta a ponta (fixture reproduzível a partir de exemplo oficial DJP/PP 58/2023) bate com cálculo de referência centavo a centavo.

## Escopo — 9 workstreams

### WS1 — Corrigir TER B/C sem dados no engine (Crítico, legal)
- Criar `src/packs/indonesia/params/ter-tables.ts` com `TER_A`, `TER_B`, `TER_C` como dados puros, versionados por `paramsVersion = "2026.1"` e legalBasis (`PP 58/2023`).
- Registrar essas tabelas como valores no `ConfigService` via um `StaticConfigProvider` dedicado (chaves `id.tax.terTable.A|B|C` e `id.tax.terZero`).
- `src/lib/engines/indonesia.ts` deixa de embutir tabelas: `terRate(gross, category, tables)` recebe as tabelas. O provider `tax` resolve as tabelas por `ctx.config` no `install()` e injeta no engine.
- Prepara caminho para DEBT-022 sem mover as tabelas para `regulatory_parameters` ainda (a promoção para register vem depois; nesta sprint, provider estático já basta).
- Bumps: `ID_PARAMS.version` → `"2026.1"`; manifest `version` → `1.9.0`; `rulesetVersion` → `ID-2026.1`.

### WS2 — UMP paramétrica por província (Alto, legal)
- Semear as 34 províncias em `src/packs/indonesia/params/ump-2026.ts` (fonte oficial 2026; onde faltar, usar valor 2024 com flag `stale: true` e DEBT registrado).
- Expor via `StaticConfigProvider` sob a chave `id.wages.ump.<province>`.
- `evaluateContract` / `ID-UMR-01` (`src/lib/engines/id-pack.ts:12-22`) resolve UMP pela província do empregado. Sem província → fallback `Other` + finding informativo (não crítico).

### WS3 — Calendário de THR (Alto, legal)
- Substituir data hardcoded em `src/lib/obligations.catalog.ts:106-112` por resolução via tabela `src/packs/indonesia/params/eid-al-fitr.ts` (2025–2030), exposta em `id.calendar.eidAlFitr.<year>`.
- Sem entrada para o ano → obrigação marcada `needs_review` em vez de data errada.

### WS4 — Primeiro pack no Registry, com relatório em duas dimensões (Crítico, plataforma)
- Popular `pack_registry` com Indonesia v1.9.0: `country_code=ID`, `interface_version=1.0.0`, `checksum`, `state=ready`.
- Persistir **compatibility report da publicação** em coluna dedicada (`pack_registry.compatibility_report`) — snapshot imutável do momento em que o pack foi publicado.
- Persistir **compatibility report do boot** em `compatibility_reports` a cada `runBootGate()` (ver WS7) — reflete estado atual (Runtime/SDK/gates da execução). Auditor compara publicação × boot para detectar drift.
- `pack_installations` recebe histórico (`installed_from=registry`).

### WS5 — Assinatura com `keyId` (Crítico, segurança)
- Manifest do ID recebe `interfaceVersion: "1.0.0"` e o bloco:
  ```
  signature: {
    keyId: "<hash público estável, ex. sha256(publicKey)[:16]>",
    algorithm: "Ed25519",
    signature: "<base64>",
    countersign?: { keyId, algorithm, signature }
  }
  ```
- `pack_signing_keys` ganha coluna `key_id` (não ainda no schema — migração dedicada com GRANTs) para lookup por id, independente de `publisher`. Isso destrava rotação futura sem alterar manifest schema.
- CLI mínima `scripts/sign-pack.ts`: gera Ed25519, calcula `keyId`, grava chave (`publisher=uboard-id`, capability `pack.sign`), assina manifest.
- Countersign de plataforma (`pack.countersign`) satisfaz trust policy de produção (2 assinaturas).
- `verifyEd25519` / `TrustStore.findByKeyId(keyId)` passa a resolver por `keyId`; `publisher` vira metadado, não chave de busca.
- **Não** ativar `signature_enforce=true` nesta sprint — apenas garantir que ligar em preview passa boot.

### WS6 — `PackRegistryDivergence@1` (Alto, observabilidade)
- Ampliar o step "registry" em `src/sdk/boot.ts` para: se `registry_enabled=true`, comparar packs em memória (bootstrap) com `pack_registry` por `(country_code, version, checksum)`.
- Emitir `PackRegistryDivergence@1` no bus com `reason` categorizado: `missing_in_registry`, `version_mismatch`, `checksum_mismatch`.
- Enquanto Registry só tiver ID, MY/PH divergem — emitir com severidade `info` para não gerar alerta ruidoso até H11.2.

### WS7 — Persistência de relatórios de boot (Alto, observabilidade)
- `runBootGate()` grava `runtime_boot_reports` a cada execução (via `boot.server.ts`, já com scaffold).
- `CompatibilityService.checkAll()` grava uma linha por pack em `compatibility_reports` (matrixVersion, sig status, rejeições, refs para o `pack_registry.compatibility_report` da publicação, para diff).
- Retenção default, sem TTL nesta sprint.

### WS8 — Cobertura de testes (Médio, qualidade)
- `src/sdk/testkit/fixtures/ID.ts`: casos TER B (K/2, TK/2, TK/3) e TER C (K/3) que só passam com tabelas próprias existindo.
- `runThirteenthProviderSuite` com fixtures ID (`<1 mês`, `6 meses`, `=12 meses`, `>12 meses`).
- `runContractProviderSuite` com PKWT (probation proibida, limite de renovação Omnibus) e PKWTT.
- Ampliar `health()` do pack para smoke-testar `contracts.validate`, `calendar.templates()`, `thirteenth.calculate`.

### WS9 — Payroll oficial ponta a ponta (novo portão, Crítico)
- Adicionar `src/packs/indonesia/__tests__/payroll-golden.test.ts` com uma fixture oficial: um funcionário TK/0 e um K/2, cada um em ≥3 faixas salariais representativas, cobrindo BPJS abaixo/acima do cap e PPh 21 TER A/B.
- Cada caso traz `expected` derivado de exemplo oficial (DJP / cartilha PP 58/2023) ou cálculo manual documentado no fixture (referência legal citada por caso).
- Teste executa `payroll.buildPayslip()` do pack e compara `gross`, `tax.tax`, `bpjs.employee.total`, `bpjs.employer.total`, `net`, `employerCost` — tolerância 0 (arredondamento é parte da regra).
- Se algum valor oficial estiver indisponível, marcar o caso como `.skip` com TODO explícito em vez de aceitar valor aproximado.

### Fora de escopo (deferido, explícito)
- Ativar `signature_enforce=true` em produção — depende dos 14 dias de observação (H11.1b).
- Remover `bootstrap.ts` — H11.2.
- Promover parâmetros do ID para `regulatory_parameters` como Source of Truth — depende do ConfigurationService bridge (DEBT-023).
- Versionamento data-efetiva de caps BPJS — DEBT, não bloqueia go-live.

## Portões de saída

Todos verdes antes de fechar a sprint:

- `bun test src/packs/indonesia/` verde, incluindo TER B/C, THR, contratos e **payroll-golden**.
- `select count(*) from pack_registry where country_code='ID'` = 1, com `compatibility_report` não-nulo.
- `select count(*) from pack_signing_keys where active` ≥ 2 (author + countersign), ambas com `key_id` preenchido.
- `select count(*) from runtime_boot_reports` cresce a cada boot em preview.
- `select count(*) from compatibility_reports where pack_country='ID'` cresce a cada boot.
- Em preview com `signature_enforce=true` temporário, boot do ID resulta em `status=ready`.
- Em preview com `registry_enabled=true` e ID ausente do registry, `PackRegistryDivergence@1` aparece em `metrics_events` com `reason=missing_in_registry`.

## Riscos e mitigações

- **Dados TER B/C oficiais.** Se faltar bracket, marcar `needs_review` no fixture e não chutar. Payroll-golden trava sprint até termos números oficiais.
- **UMP 34 províncias.** Onde faltar 2026, semear 2024 + `stale: true` + DEBT dedicado.
- **Assinatura em Worker.** `verifyEd25519` já usa Web Crypto; validar em preview.
- **Ruído de divergência.** MY/PH divergem enquanto registry só tiver ID — severidade `info` até H11.2.

## Detalhes técnicos (para engenharia)

- Arquivos alvo principais: `src/packs/indonesia/params/*` (novos), `src/lib/engines/indonesia.ts`, `src/lib/countryPacks.ts`, `src/lib/engines/id-pack.ts`, `src/lib/obligations.catalog.ts`, `src/packs/indonesia/index.ts`, `src/sdk/boot.ts`, `src/sdk/compatibility.ts`, `src/sdk/trust-store.ts` (`findByKeyId`), `src/lib/platform/service/signing.ts`, `src/lib/platform/boot.server.ts`, `src/sdk/testkit/index.ts`, `src/sdk/testkit/fixtures/ID.ts`, `scripts/sign-pack.ts`.
- Migrações novas nesta sprint:
  - `pack_signing_keys` + coluna `key_id text` (com índice único parcial `where active`), GRANTs preservados.
  - `pack_registry` + coluna `compatibility_report jsonb` (nullable).
  - `compatibility_reports` + coluna `published_report_ref uuid` (fk opcional para `pack_registry.id`) para permitir diff publicação×boot.
- Nada em `src/packs/malaysia/**` ou `src/packs/philippines/**` é alterado.

## Entregáveis de documentação

- `docs/tech-debt.md`: mover DEBT (TER B/C, UMP, THR calendar, registry vazio, signing keys vazias) para "delivered H11.1a".
- Novo ADR: `docs/governance/adr-0020-registry-as-source.md` — corte para registry-first no boot gate, com dois relatórios (publicação vs boot) e assinatura por `keyId`.
