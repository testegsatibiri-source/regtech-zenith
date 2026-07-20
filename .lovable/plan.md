
# Auditoria arquitetural e Sprint H5 — Compliance SDK

## Onde estamos hoje (auditoria)

| Área | Estado atual | Gap vs. proposta |
|------|--------------|------------------|
| CountryPack | Interface única em `engines/types.ts` (tax + social + 13th + rules) | Falta split em Providers (Payroll / Tax / Benefits / Calendar / Contract / Rule / Audit) |
| Runtime | `registry.ts` = `Map` simples + bootstrap direto no import | Sem carregador, sem validação de versão, sem resolução de dependências, sem cache |
| Manifesto | Inexistente — código é a fonte da verdade | Falta `country.yaml`/`manifest.ts` com `version`, `engines`, `requiresCore` |
| Versionamento | Só `rulesetVersion` string dentro do pack | Sem semver independente de Core / Pack, sem checagem de compatibilidade |
| Instalação | Bootstrap hard-coded (`registerPack(indonesiaPack)`) | Sem "marketplace"/registrar dinâmico com UI de instalação |
| Capability discovery | Consumidores assumem THR, BPJS etc. (`audit.tsx`, dashboard, calendar) | Falta `pack.supports("thr")`; UI condicional |
| Metadata Registry | Só packs | Falta registry de providers/validators/reports/obligations/calculators |
| DI | `getPack()` importado direto pelos consumers; `id-pack` importa `ID_PARAMS` | Falta container/injeção via interface |
| Event Bus | `events/bus.ts` in-process, 4 tipos, sem emissão real (DEBT-001) | Falta catálogo oficial de eventos + emissão nas mutations |
| Governance | Só `docs/tech-debt.md` | Faltam ADRs, Country Pack Spec, Contribution/Release/Security/Version/Migration policies |

Diagnóstico: a fundação de H1–H4 é sólida, mas o `CountryPack` é monolítico e o Core ainda "conhece" a Indonésia por caminho de import. Antes de escrever MY/SG/PH, a plataforma precisa virar SDK.

## Escopo desta sprint (H5 — SDK & Governance)

Sem novos módulos de negócio. Só refactor de plataforma + docs.

### 1. `@uboard/compliance-sdk` (pasta `src/sdk/`)
Novo pacote lógico com contratos puros — zero dependência de Supabase, React ou libs de país:
- `sdk/providers/` — um arquivo por provider:
  - `PayrollProvider`, `TaxProvider`, `BenefitsProvider`, `CalendarProvider` (retorna templates de obrigação), `ContractProvider` (regras PKWT/PKWTT-like), `RuleProvider` (compliance rules), `AuditProvider` (heurísticas de auditoria/IA).
- `sdk/CountryPack.ts` — interface do pack = manifest + mapa opcional `providers: Partial<Record<Capability, Provider>>`.
- `sdk/Capability.ts` — enum: `payroll | tax | benefits | thirteenth | overtime | leave | calendar | contracts | audit`.
- `sdk/manifest.ts` — tipo `CountryManifest { country, version (semver), engines[], supportedLanguages[], requiresCore }`.
- `sdk/events.ts` — catálogo oficial versionado: `PayrollCalculated@1`, `TaxCalculated@1`, `ContractExpired@1`, `EmployeeCreated@1`, `RuleFailed@1`, `ComplianceUpdated@1`, `AuditCompleted@1` (+ manter os `@1` já existentes).
- `sdk/errors.ts` — `PackNotFound`, `IncompatibleCoreVersion`, `CapabilityUnsupported`.
- `sdk/version.ts` — `CORE_VERSION = "2.0.0"` + `satisfies(range, version)` mínimo (sem dep externa).

### 2. Country Runtime (`src/sdk/runtime.ts`)
Substitui o `Map` bruto do `registry.ts`:
- `CountryRuntime.install(pack)` — valida manifest, checa `requiresCore` contra `CORE_VERSION`, resolve providers, popula cache.
- `CountryRuntime.get(code)` — lookup com erro tipado.
- `CountryRuntime.supports(code, capability)` — capability discovery.
- `CountryRuntime.list()` — inclui `status: installed|incompatible`.
- Emite `CountryPackInstalled@1` / `CountryPackFailed@1` no bus.

### 3. Reescrever Indonesia como pack SDK
- Novo `src/packs/indonesia/` com:
  - `manifest.ts` (`version: "1.7.0"`, `engines: ["payroll","tax","benefits","thirteenth","overtime","calendar","contracts","audit"]`, `requiresCore: ">=2.0.0"`).
  - `providers/tax.ts`, `providers/benefits.ts` (BPJS), `providers/thirteenth.ts` (THR), `providers/payroll.ts` (compõe os anteriores), `providers/calendar.ts` (move `obligations.catalog.ts`), `providers/contracts.ts` (move `engines/contracts.ts`), `providers/rules.ts` (move compliance rules), `providers/audit.ts` (move heurísticas de `audit.functions.ts`).
  - `params.ts` (ex-`ID_PARAMS`).
  - `index.ts` — exporta `indonesiaPack: CountryPack`.
- `src/lib/engines/*` vira thin shim que re-exporta do SDK+pack, para não quebrar imports enquanto migra callers. Marcado `@deprecated`.

### 4. Dependency Injection nos consumers
Substituir imports diretos em:
- `src/lib/data.functions.ts` — usa `runtime.get(company.country).providers.payroll`.
- `src/lib/audit.functions.ts` — usa `providers.audit` (elimina DEBT-005).
- `src/lib/calendar.functions.ts` — usa `providers.calendar` para templates de obligation.
- `src/lib/contracts.functions.ts` — usa `providers.contracts`.
- `src/routes/_authenticated/dashboard.tsx` + `audit.tsx` + `calendar.tsx` — chamam `runtime.supports(...)` antes de renderizar cards de THR/BPJS/etc.

### 5. Event Bus oficial
- Estender `src/lib/events/bus.ts` para importar o catálogo do SDK (`sdk/events.ts`).
- Emitir eventos nas mutations que hoje não emitem (fecha DEBT-001):
  - `finalizePayrollRun` → `PayrollCalculated@1` + `PayrollFinalized@1`.
  - `upsertEmployee` → `EmployeeCreated@1` / `EmployeeUpserted@1`.
  - `updateObligationStatus` → `ObligationStatusChanged@1`.
  - `upsertContract` → `ContractChanged@1`; scheduler detector emite `ContractExpired@1`.
  - `runComplianceAudit` → `AuditCompleted@1` + `RuleFailed@1` por finding crítico.
- Handler default assina `ComplianceUpdated@1` para invalidar `companies.score_cache` (fecha DEBT-007).

### 6. "Marketplace" interno (UI mínima)
- Nova rota `/settings/country-packs` (só leitura + toggle install/uninstall no runtime em memória — persistência real fica para depois).
- Lista packs disponíveis com badge de versão, capabilities suportadas, status de compatibilidade.
- Stub `malaysiaPack` (manifest `0.1.0`, sem providers) só para provar multi-pack (fecha DEBT-004).

### 7. Governance (`docs/governance/`)
Documentos novos, curtos e opinativos:
- `ADR-0001-compliance-sdk.md` — decisão desta sprint.
- `ADR-0002-event-catalog.md` — versionamento `@N` de eventos.
- `country-pack-spec.md` — contrato que cada pack deve implementar.
- `contribution-guide.md` — como abrir novo pack (MY/SG/PH).
- `release-process.md` — semver de Core vs. Pack.
- `security-policy.md` — RLS, hashing, service-role rules (referencia o que já existe).
- `api-version-policy.md` — regras de `/api/public/v1` + sunset.
- `migration-policy.md` — como migrar params sem deploy (referencia DEBT-009).
- Atualizar `docs/tech-debt.md` marcando DEBT-001/004/005/007 fechados.

## Fora de escopo
- Persistência real de instalação de packs (marketplace real).
- Escrever regras de MY/SG/PH (só stub vazio).
- Loader de `country.yaml` do disco — o manifest fica em TS por enquanto (spec documentada em YAML no `country-pack-spec.md`).
- Qualquer mudança em auth, UI theming, i18n, ou motores de cálculo em si.

## Notas técnicas

```text
src/
├── sdk/                         # contratos puros, sem I/O
│   ├── Capability.ts
│   ├── CountryPack.ts
│   ├── manifest.ts
│   ├── version.ts
│   ├── errors.ts
│   ├── events.ts
│   ├── runtime.ts
│   └── providers/
│       ├── PayrollProvider.ts
│       ├── TaxProvider.ts
│       ├── BenefitsProvider.ts
│       ├── CalendarProvider.ts
│       ├── ContractProvider.ts
│       ├── RuleProvider.ts
│       └── AuditProvider.ts
├── packs/
│   ├── indonesia/…              # reimplementa ID via SDK
│   └── malaysia/manifest.ts     # stub
├── lib/engines/*                # shims @deprecated → SDK
└── docs/governance/*.md
```

Compatibilidade: `engines/registry.ts::getPack` mantém API pública durante a migração — internamente delega ao `CountryRuntime`. Nenhuma tabela nova, nenhuma migração SQL nesta sprint.

Ordem de execução: SDK → Runtime → pack ID reescrito → shims → DI nos consumers → eventos → UI de packs → governance/docs → typecheck.
