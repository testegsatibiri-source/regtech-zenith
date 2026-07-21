# Sprint H11 — Consolidação Arquitetural (Checkpoint pré-migração)

Adoto integralmente os 7 refinamentos. H11 **não** adiciona módulos novos — apenas consolida H10 e executa a transição `bootstrap → registry` com o mínimo de risco. Nenhum arquivo em `src/packs/**` ou `src/lib/engines/**` é tocado.

## Análise dos refinamentos

| # | Refinamento | Veredicto | Onde entra |
|---|-------------|-----------|------------|
| 1 | Boot Health Gate obrigatório | Adotado — pré-requisito de tudo | H11-Boot |
| 2 | Versionar CompatibilityService (engine + matrix) | Adotado | H11-Mat |
| 3 | Remoção do bootstrap em 2 etapas (H11.1 coexistência com comparação, H11.2 remoção) | Adotado | H11-Reg |
| 4 | Congelar Country Pack Interface v1.0 antes de remover bootstrap | Adotado — pré-requisito da H11.2 | H11-Freeze |
| 5 | Readiness Report automático pós-boot | Adotado | H11-Boot |
| 6 | Feature Gates por ambiente (`registry_enabled`, `signature_enforce`, `compatibility_matrix`, `config_service`) | Adotado | H11-Gates |
| 7 | Códigos de rejeição de assinatura estruturados | Adotado | H11-Sig |

Ordem de execução: **Gates → Boot Gate + Readiness → Matrix v1 → Interface Freeze v1.0 → H11.1 (coexistência) → sig enforce em prod → H11.2 (remoção)**.

---

## 1. H11-Gates — Feature Gates de plataforma

Nova camada em `src/sdk/feature-gates.ts`, alimentada por `pack_feature_flags` (já existe) com escopo `platform`:

```
registry_enabled        preview:on   staging:on   production:off
compatibility_matrix    preview:on   staging:on   production:off
signature_enforce       preview:off  staging:off  production:off
config_service          preview:on   staging:on   production:on
bootstrap_compare       preview:on   staging:on   production:on   (H11.1)
```

`FeatureGates.isEnabled(name, env)` é síncrono após boot (carregado uma vez no Boot Gate). Toda mudança de comportamento nesta sprint é gated — nada liga por padrão em produção sem ativação explícita.

## 2. H11-Boot — Boot Health Gate + Readiness Report

Novo módulo `src/sdk/boot.ts` executado uma vez no server startup (chamado de `src/start.ts`):

```text
Startup
  ↓ loadFeatureGates()          ← DB flags → cache
  ↓ loadRegistry()               ← pack_registry (se gate on)
  ↓ compatibilityMatrixCheck()   ← engine.checkMatrix()
  ↓ signatureCheck()             ← por TrustPolicy vigente
  ↓ healthCheck()                ← pack.health() de cada instalado
  ↓ Runtime.markReady()
```

- Qualquer etapa `error` deixa o Runtime em estado `degraded` ou `failed`; `CountryRuntime.isReady()` passa a existir e é consultado pelos handlers de API/UI.
- Emite `RuntimeBootCompleted@1` com o report completo.
- Readiness Report exposto em `/platform/readiness` (UI) e `/api/public/v1/readiness` (JSON, sem PII):

```
Runtime 3.1    SDK 3.1
Registry ✔    Trust ✔    Compatibility ✔    Config ✔    Observability ✔
Packs: ID ✔  PH ✔  MY ✔  VN —
Gates: registry_enabled=on  signature_enforce=off  ...
```

## 3. H11-Mat — Compatibility Matrix + engine versionado

Novo `src/sdk/compatibility-matrix.ts` (declarativo):

```ts
export const COMPATIBILITY_MATRIX_V1 = {
  version: "1.0.0",
  runtime: "3.0.x",
  sdk: "3.0.x",
  packs: { ID: ">=2.1.0", PH: ">=2.0.0", MY: ">=1.8.0" },
};
```

`CompatibilityService` ganha `engineVersion` e `matrixVersion`; `check()` grava ambos no `CompatibilityReport` para rastreabilidade histórica. Novo método `checkMatrix()` chamado pelo Boot Gate e antes de cada `install()`. Motor v2 futuro coexiste (`compatibilityEngineV1`, `compatibilityEngineV2`) sem invalidar decisões antigas.

## 4. H11-Freeze — Country Pack Interface v1.0

- Publica `src/sdk/INTERFACE_VERSION.ts` exportando `PACK_INTERFACE_VERSION = "1.0.0"`.
- Manifesto passa a exigir `interfaceVersion` compatível via semver — validador rejeita packs fora do range.
- Documentado em novo `docs/governance/country-pack-interface-v1.md` (contrato imutável: assinaturas de provider, shape do manifesto, eventos emitidos, permissões declaráveis).
- Pré-requisito **hard** para H11.2. Enquanto não publicado, `bootstrap.ts` permanece.

## 5. H11-Reg — Registry como fonte, em duas etapas

### H11.1 (coexistência com comparação)
- `bootstrap.ts` continua rodando.
- Boot Gate hidrata também do `pack_registry` (quando `registry_enabled=on`).
- `CompatibilityService` roda em ambos os caminhos; divergências emitem `PackRegistryDivergence@1` já com o `matrixVersion`/`engineVersion` no payload.
- UI `/platform/packs` mostra badge "Registry vs Bootstrap" com contagem de divergências dos últimos 14 dias.
- Critério de saída: **14 dias corridos com 0 divergências em todos os ambientes**, registrado em `platform_audit_log`.

### H11.2 (remoção)
Pré-requisitos verificados por script (`scripts/verify-h11-ready.ts`):
1. Interface v1.0 publicada.
2. `registry_enabled=on` em prod há ≥ 14 dias.
3. 0 divergências no período.
4. `PACK_SIG_ENFORCE=enforce` ativo em produção há ≥ 7 dias sem rejeição inesperada.

Ao passar: remover `src/sdk/bootstrap.ts`, remover import em `src/start.ts`, remover gate `bootstrap_compare`. Emite `BootstrapRemoved@1`.

## 6. H11-Sig — Enforcement + códigos de rejeição

`verifyEd25519` / `CompatibilityService` passam a retornar código estruturado:

```ts
type SignatureRejectionCode =
  | "signature_missing"
  | "signature_invalid"
  | "key_revoked"
  | "key_unknown"
  | "capability_missing"
  | "distinct_signers_required"
  | "policy_failed"
  | "matrix_failed";
```

- Toda rejeição grava linha em `platform_audit_log` (action `pack.signature.rejected`) com `code`, `pack_id`, `env`, `trust_policy`.
- Novo painel `/platform/packs/signatures` lista rejeições recentes agrupadas por código.
- `PACK_SIG_ENFORCE=enforce` ativado apenas em **production** ao final da sprint (staging permanece `warn`, preview permanece `off`).

---

## Migrações

Uma única migração `h11_consolidation`:

```
pack_feature_flags     seed dos 5 platform gates
platform_audit_log     índice em (action, created_at)
compatibility_reports  nova tabela (id, pack_id, engine_version, matrix_version,
                        ok, checks jsonb, created_at) + RLS + GRANT
runtime_boot_reports   nova tabela (id, ts, ready, report jsonb) + RLS + GRANT
```

Sem alteração em tabelas de negócio. GRANTs por role conforme `public-schema-grants`.

## ADRs

- **ADR-0016** — Boot Health Gate & Readiness Report
- **ADR-0017** — Compatibility Engine & Matrix Versioning
- **ADR-0018** — Country Pack Interface v1.0 (contrato congelado)
- **ADR-0019** — Feature Gates de plataforma e estratégia de rollout gradual

## Métricas de conclusão

- 0 arquivos alterados em `src/packs/**` e `src/lib/engines/**`.
- Boot Gate obrigatório em todos os ambientes; `/platform/readiness` verde.
- Interface v1.0 publicada e validada por manifesto.
- H11.1 concluída com 14 dias / 0 divergências antes de qualquer remoção.
- `bootstrap.ts` removido apenas após todos os pré-requisitos automatizados passarem.
- `PACK_SIG_ENFORCE=enforce` ativo em produção, com códigos de rejeição estruturados em audit log.
- Conformance suite (35/35) preservada + novos testes: Boot Gate degradation paths, Matrix v1 satisfação, Interface v1.0 rejection, códigos de rejeição de assinatura, Feature Gate flip.

## Fora de escopo (adiado)

- Novos módulos de negócio.
- Compatibility Engine v2 (a versão v1 é a que entra; v2 fica preparado estruturalmente).
- Roles & Capabilities editor visual (H12).
- Novos providers de config (Database/Env/Flags) — H12.
