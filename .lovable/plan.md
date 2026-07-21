# Sprint H10 — Observability, IAM, Marketplace & Signing (v2)

Todos os 5 ajustes são adotados. Adiciono item para H11. Nada removido — apenas granularizado.

## Análise dos ajustes

| # | Ajuste | Veredicto | Impacto |
|---|--------|-----------|---------|
| 1 | ConfigProviders desde já (Static + interface) | ✅ Adotado | H10-Cfg entrega `ConfigProvider` interface + `StaticProvider`; H12 só adiciona novos providers |
| 2 | `Compatibility Service` entre Registry e Runtime | ✅ Adotado | Nova camada em H10-MKT, isola Runtime de decisões de compat |
| 3 | `Trust Policy` configurável por ambiente | ✅ Adotado | Preview: 1 assinatura; Production: 2 assinaturas |
| 4 | Métricas hot/cold (Postgres + Object Storage / Axiom) | ✅ Adotado — fundação | H10 grava em ambos via `MetricSink`; sink externo é adapter (config futura) |
| 5 | Adicionar `Experimental` antes de `Draft` no lifecycle | ✅ Adotado | Lifecycle vira 8 estados |
| — | **Version Compatibility Matrix** | ✅ Movido para H11 | Item de saída da migração completa (bootstrap → registry) |

---

## 1. H10-Cfg — Configuration Service (fundação com Providers)

Substitui `StaticConfigService` monolítico por orquestrador de providers:

```ts
// src/sdk/config.ts
export interface ConfigProvider {
  name: string;               // "static" | "database" | "env" | "flags"
  priority: number;           // lower = checked first
  get(key: string, ctx: ConfigContext): Promise<ConfigValue | undefined>;
}

export class ConfigService {
  constructor(private providers: ConfigProvider[]) {}
  async resolve(key: string, ctx: ConfigContext): Promise<ConfigValue> {
    for (const p of [...this.providers].sort((a,b) => a.priority - b.priority)) {
      const v = await p.get(key, ctx);
      if (v !== undefined) return v;
    }
    throw new ConfigMissing(key);
  }
}
```

**H10 entrega:** interface + `StaticProvider` (lê `pack.params`) + registro no `ProviderContext` (`ctx.config`).
**H12 adiciona:** `DatabaseProvider` (overrides por customer), `EnvironmentProvider`, `FeatureFlagProvider`. Zero mudanças no `ConfigService` ou nos providers de pack.

ADR-0014 documenta ordem de precedência canônica: `DB Override → Feature Flags → Environment → Static Defaults`.

---

## 2. H10-MKT — Marketplace com Compatibility Service

### Nova pipeline
```
Registry ──► CompatibilityService ──► Runtime
              │
              ├─ interfaceVersion match (SDK vs pack)
              ├─ requiresCore semver satisfies CORE_VERSION
              ├─ dependencies[] resolvem (packs instalados)
              ├─ breaking changes vs versão anterior instalada
              └─ signature(s) válidas conforme Trust Policy
```

`src/sdk/compatibility.ts`:
```ts
export interface CompatibilityReport {
  ok: boolean;
  checks: { name: string; ok: boolean; severity: "error"|"warning"; message?: string }[];
}
export class CompatibilityService {
  check(pack: CountryPack, trust: TrustPolicy, installed: InstalledPack[]): CompatibilityReport
}
```

`CountryRuntime.install()` passa a delegar essas checagens ao `CompatibilityService` — hoje elas estão embutidas em `runtime.ts` + `validator.ts`. Refactor sem breaking change externo: `install()` continua com mesma assinatura.

### Lifecycle estendido (8 estados)
```
Experimental → Draft → Review → Approved → Published → Deprecated → Yanked → Archived
```

- **Experimental**: só visível para autor + `platform_admin`; não aparece em listagens de marketplace. Sem assinatura obrigatória. Permite desenvolvimento iterativo.
- **Draft**: submetido ao processo; assinatura do autor exigida.
- **Review → Approved → Published**: como antes.

State machine em `service/packs.ts` valida transições permitidas; `Experimental → Draft` requer assinatura do autor.

### Fase 1 (H10)
`bootstrap.ts` + `pack_registry` coexistem; `CompatibilityService` roda em ambos os caminhos e emite `PackCompatibilityDivergence@1` quando resultados divergem. Zero risco de brick.

---

## 3. H10-Sig — Dupla assinatura + Trust Policy

### Trust Policy (novo)
```ts
// src/sdk/trust-policy.ts
export interface TrustPolicy {
  environment: "preview" | "staging" | "production";
  requiredSignatures: number;                    // 1 (preview) | 2 (prod)
  requiredCapabilities: SigningCapability[];     // ["sign_pack"] | ["sign_pack","countersign_pack"]
  distinctSigners: boolean;                      // true em prod
  allowExperimental: boolean;                    // true em preview
}
```

Perfis pré-definidos:
- `preview`: 1 assinatura (`sign_pack`), permite Experimental sem assinatura.
- `staging`: 1 assinatura obrigatória.
- `production`: 2 assinaturas distintas (`sign_pack` + `countersign_pack`).

`CompatibilityService` recebe `TrustPolicy` do ambiente atual (`process.env.LOVABLE_ENV`) e aplica. UI `/platform/packs` mostra a policy vigente.

### TrustStore abstrato (mantido)
Interface `TrustStore` + `DbTrustStore` (H10). Adapters KMS/HSM em sprints futuras sem tocar em Runtime/Signature.

---

## 4. H10-IAM — Capabilities-first (sem alterações vs plano anterior)

Mantido como aprovado: `Capability → Permission → Role`, `role_capabilities` table, `PermissionService` refatorado para resolver via caps. Convites em `platform_invitations`, UI `/platform/users`, guardrail "último admin".

---

## 5. H10-Obs — Observabilidade em camadas + MetricSink hot/cold

### Taxonomia (mantida)
`runtime | api | database | packs | business` — coluna `layer` obrigatória.

### MetricSink (novo)
```ts
// src/lib/observability/sink.ts
export interface MetricSink {
  name: string;
  ingest(events: MetricEvent[]): Promise<void>;
}

// H10 registra:
//   PostgresSink   → tabela metrics_events (hot, últimos 30 dias, view materializada)
//   FileSink       → JSON lines em Storage bucket "metrics/YYYY-MM-DD/" (cold, 365 dias)
// Futuro (H12+): AxiomSink, BetterStackSink — adapters, sem tocar em logger/metrics.
```

- Cron diário: `metrics_events` > 30 dias → export para Storage → truncate hot.
- Query API `/platform/observability/query` decide fonte pela janela pedida.
- Documentado em ADR-0015 (Hot/Cold Metrics Tiering).

### Incidents + Postmortems (mantido)
Tabelas `incidents` + `postmortems`, UI, ligação com `alert_incidents`.

### Alertas (mantido)
`alert_rules / notifications / escalations / incidents` + adapters `Slack`, `Email`, `Webhook` funcionais; SMS/WhatsApp/PagerDuty stubs.

### Backups (mantido)
`pg_cron` diário → `/api/public/hooks/backup-run` → Storage `backups/YYYY-MM-DD/`. Retenção 30/90/365.

---

## Migrações (uma por bloco)

```
h10_iam    platform_invitations, role_capabilities (+ seed), triggers
h10_mkt    pack_registry, pack_installations ext, pack_state enum (8),
           pack_lifecycle_events, trust_policies (config por env)
h10_sig    pack_signing_keys (+ capabilities[], provider)
h10_obs    metrics_events.layer, MVs por layer,
           incidents, postmortems,
           alert_rules, alert_notifications,
           alert_escalations, alert_incidents,
           metrics_export_log (para tracking hot→cold)
```

---

## ADRs

- **ADR-0010** — Observability layers + Hot/Cold tiering + Incidents/Postmortems
- **ADR-0011** — Capabilities-first IAM
- **ADR-0012** — Pack Marketplace Lifecycle (8 estados) + Compatibility Service + 2-phase migration
- **ADR-0013** — Dupla assinatura Ed25519 + TrustStore + Trust Policy
- **ADR-0014** — Configuration Service (ConfigProvider pattern, precedência)
- **ADR-0015** — Metrics Hot/Cold Sinks

---

## Ordem de execução

1. **H10-Sig** — TrustStore + Trust Policy + dupla assinatura
2. **H10-IAM** — Capabilities + convites (habilita `PACK_COUNTERSIGN`)
3. **H10-MKT Fase 1** — Registry + CompatibilityService + lifecycle 8-estados (coexistindo com bootstrap)
4. **H10-Cfg** — ConfigService + ConfigProvider interface + StaticProvider
5. **H10-Obs** — Layers + MetricSink hot/cold + incidents + alertas + backups

---

## H11 (preview — não implementar nesta sprint)

Escopo da próxima sprint, para contexto:

1. **Remoção do `bootstrap.ts`** — Runtime hidrata exclusivamente de `pack_registry`. Pré-requisito: 2+ semanas sem `PackCompatibilityDivergence@1`.
2. **Version Compatibility Matrix** (novo, sugestão adotada):
   ```
   src/sdk/compatibility-matrix.ts
   ```
   Tabela declarativa validada no boot e antes de qualquer install:
   ```
   Component      Required
   ─────────────  ────────
   Runtime        3.0.x
   SDK            3.0.x
   Pack ID        ≥2.1.0
   Pack PH        ≥2.0.0
   Pack MY        ≥1.8.0
   ```
   `CompatibilityService.checkMatrix()` valida a matriz global antes de qualquer transição de lifecycle. Publicada em `/platform/packs/matrix`.
3. Enforcement de assinatura em `production` (flag `PACK_SIG_ENFORCE=enforce`).
4. Roles & Capabilities editor (matriz `role × capability` editável para parceiros externos).

---

## Métricas de conclusão H10

- 0 arquivos alterados em `src/packs/**` e `src/lib/engines/**`.
- `bootstrap.ts` intacto.
- Conformance atual (35/35) preservada + novos testes:
  - `CompatibilityService` (matriz + assinatura + deps)
  - `TrustPolicy` por ambiente
  - State machine 8-estados (incluindo Experimental invisível para não-autor)
  - `PermissionService` capability-based
  - `ConfigService` com múltiplos providers
  - `MetricSink` hot→cold roundtrip
  - Alert evaluation + escalation
- Demo E2E: pack "Vietnam Experimental" criado, promovido para Draft (assinado), Review, countersignado, Published em preview (1 sig) e falha em production (exige 2 sigs) — confirmando Trust Policy funcionando.
