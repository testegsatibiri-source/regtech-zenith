# Sprint H6 — SDK Hardening: DI, Validator, Test Kit
### + adoção das suas 4 sugestões / H7 reservado para Lifecycle

## Análise das suas propostas (relevância × viabilidade × timing)

| # | Proposta | Relevância | Viabilidade | Onde entra |
|---|---|---|---|---|
| 1 | **Capability Versioning** (`interfaceVersion` por provider) | Alta — hoje `requiresCore` é grosso demais; um bump em `TaxProvider` força bump do Core inteiro. Desacopla evolução por capacidade. | Alta — 1 campo por interface + checagem no Validator. | **H6, agora** |
| 2 | **Manifesto expandido** (`provides`/`requires`/`events`/`permissions`/`dependencies`/`features`) | Alta — habilita o Runtime a resolver dependências entre packs e a autorizar acesso a APIs sensíveis (ex.: `permissions: ["storage.read"]`). | Alta para `provides/requires/events/features`; média para `permissions` (precisa enforcement no runtime — só declaração agora). | **H6, agora** (declarativo + validação) |
| 3 | **Health Check por pack** (`pack.health()` → ok/warnings/errors) | Alta — detecta pack "meio instalado" (ex.: `calendar` declarado mas `templates()` vazio, params faltando). Diferente do Validator: roda em runtime, não só em install. | Alta — método opcional na interface `CountryPack`; UI `/country-packs` mostra status. | **H6, agora** |
| 4 | **Signature reservada** (`signature/publisher/checksum` no manifesto) | Média/estratégica — sem uso imediato, mas travar o contrato agora evita breaking change quando publishers externos entrarem. | Trivial — só campos opcionais tipados; Validator ignora se ausente, valida formato se presente. | **H6, agora** (só contrato + tipos) |
| 5 | **Country Pack Lifecycle** (`Installing → Validating → Initializing → Ready → Deprecated → Disabled → Failed`) | Alta para operação (rollback, hot-swap, troubleshooting). | Média — exige state machine + persistência + hooks (`onInstall`, `onEnable`, `onDisable`). Escopo próprio. | **H7 (sprint seguinte)** — reservo espaço no manifesto (`lifecycleHooks?`) mas não implemento. |

Consenso: 1–4 entram nesta sprint porque compõem o Validator; 5 vira Sprint H7 dedicada.

---

## Escopo H6 (o que entra)

### 1. DI completa — remover `@/lib/engines/*` dos callers
Auditoria confirmou 12 arquivos com import direto de `@/lib/engines/{indonesia,contracts,compliance,registry}`. Callers passam a resolver via Runtime:

```ts
const tax = CountryRuntime.require(company.country, "tax", "tax");
tax.calculate({ monthlyGross, maritalStatus, hasNpwp });
```

Afetados:
- **Server:** `src/lib/data.functions.ts`, `audit.functions.ts`, `calendar.functions.ts`, `contracts.functions.ts`
- **UI:** `src/routes/_authenticated/{dashboard,payroll,contracts,employees}.tsx`, `src/components/PayrollCalculator.tsx`
- **APIs:** `src/routes/api/public/{,v1/}calculate-{tax,bpjs}.ts`, `v1/health.ts` (usam `CountryRuntime.list()` no lugar de `listPacks`)

`src/lib/engines/*` é rebaixado a implementação interna do pack ID (movido para `src/packs/indonesia/internal/`); nada fora de `src/packs/indonesia/` importa dali. `src/lib/engines/registry.ts` deletado (Runtime é a fonte). Rotas legadas `/api/public/calculate-{tax,bpjs}` continuam funcionando via Runtime até o sunset já agendado (2026-10-15).

### 2. Isolamento entre providers (`ProviderContext`)
Runtime injeta `ctx` com sibling providers no `resolve()`:

```ts
PayrollProvider.buildPayslip(input, ctx: { tax, benefits, thirteenth })
```

Providers em `src/packs/**/providers/*` **não podem importar outro provider por caminho** — apenas via `ctx`. Regra aplicada no ESLint (regra `no-restricted-imports` local) e verificada no Test Kit.

### 3. Capability Versioning (sua sugestão #1)
Cada interface de provider ganha `interfaceVersion: "1.0"`. Cada provider declara `readonly version: string`. SDK exporta a matriz `EXPECTED_INTERFACES = { tax: "1.0", benefits: "1.0", ... }`. Validator rejeita pack cuja versão não satisfaz o range esperado.

### 4. Manifesto expandido (sua sugestão #2)
Adiciona ao `CountryManifest`:
```ts
provides: Capability[]      // = engines (renomeado semanticamente, engines mantém alias)
requires: Capability[]      // ex.: audit requires calendar
events: { emits?: SdkEventType[]; consumes?: SdkEventType[] }
permissions?: string[]      // declarativo agora, enforcement fica p/ H7
features?: string[]         // flags opcionais ("multi-currency", "expat-visa")
dependencies?: { pack: string; range: string }[]  // country pack → country pack
signature?: { publisher: string; checksum: string; algo: "sha256" }  // opcional (sua #4)
lifecycleHooks?: { onInstall?: string; onEnable?: string }  // placeholder p/ H7
```
Validator checa: todo `requires` tem provider correspondente (próprio ou de outro pack instalado); todo evento em `emits/consumes` existe no `SdkEvent` catalog; `signature.checksum` bate com hash do bundle serializado (se presente).

### 5. Compatibility Validator (`src/sdk/validator.ts`)
Executado dentro de `CountryRuntime.install()`. Retorna `ValidationReport { ok, errors[], warnings[] }`. Checa:
- `requiresCore` satisfaz `CORE_VERSION`
- Cada capability em `provides` tem provider e a versão do provider satisfaz `EXPECTED_INTERFACES[cap]`
- `requires` resolvido
- Eventos declarados existem
- `rulesetVersion` no formato `<CC>-YYYY.N`
- `signature` (se presente): formato válido; `checksum` reservado para verificação futura, mas se `algo` presente exige `checksum` presente
- `manifest.engines`/`provides` coerente com `Object.keys(providers)`

`errors` bloqueiam install; `warnings` deixam instalar com status `degraded`. Emite `CountryPackValidated@1` no bus.

### 6. Health Check (sua sugestão #3)
`CountryPack.health?(): Promise<HealthReport>` opcional. `HealthReport = { status: "ok"|"warn"|"error"; checks: { name: string; ok: boolean; message?: string }[] }`. Runtime executa `health()` on demand (via `CountryRuntime.health(code)`) e periodicamente no boot. UI `/country-packs` mostra badge por pack. Indonesia implementa checks básicos: params carregados, ruleset presente, obligations não-vazias, sample `tax.calculate` não-throw.

### 7. Test Kit — MVP (`src/sdk/testkit/`)
Suites parametrizadas exportadas:
- `runManifestSuite(pack)` — usa o Validator
- `runTaxProviderSuite(pack, fixtures)` — 6 casos por país
- `runBenefitsProviderSuite(pack, fixtures)` — 4 casos
- `runIsolationSuite(pack)` — verifica que arquivos do pack não importam outro pack nem `@/lib/engines/*`
- Fixtures em `src/sdk/testkit/fixtures/<CC>.ts`; ID obrigatório, MY marcado `.skip` até ter providers

Uso: `src/packs/indonesia/__tests__/conformance.test.ts` chama todas as suites. Comando único `bun test src/packs/` valida todos os packs.

### 8. Governança
- `ADR-0003` — Provider Isolation & Context Injection
- `ADR-0004` — Country Pack Conformance Testing
- `ADR-0005` — Capability Versioning & Expanded Manifest
- Atualiza `country-pack-spec.md` (novos campos + seção Conformance)
- `docs/tech-debt.md`: fecha DEBT-001, DEBT-005; abre DEBT-014 (Test Kit para Calendar/Contract/Payroll), DEBT-015 (enforcement de `permissions`), DEBT-016 (verificação real de `signature.checksum`)

---

## Fora de escopo H6 (explícito)
- **Country Pack Lifecycle state machine** → **Sprint H7** dedicada
- Enforcement real de `permissions` e verificação de `signature` → tracked como debt
- Nenhum módulo de negócio novo, nenhuma mudança de schema/RLS/auth
- Malaysia continua stub; só ganha manifesto no formato novo

---

## Diagrama final

```text
Caller (route / server-fn / UI)
  └─ CountryRuntime.resolve(code, capability)
       ├─ Validator (install-time, com capability versioning + manifesto expandido)
       ├─ health()  (runtime, sob demanda)
       └─ Provider  ← ctx { sibling providers }
              └─ pack-internal engines (src/packs/<cc>/internal/*)
```

Nada fora de `src/packs/<cc>/` importa engines desse país. Nenhum provider importa outro provider por caminho. Runtime é o único ponto de acoplamento — e agora ele sabe quais capacidades, versões, eventos e permissões cada pack traz.

---

## Preview Sprint H7 (não implementar agora)
Country Pack Lifecycle: state machine (`Installing → Validating → Initializing → Ready → Deprecated → Disabled → Failed`), hooks (`onInstall`/`onEnable`/`onDisable`), persistência do estado, UI de rollback, integração com Health Check para transição `Ready → Degraded` automática.
