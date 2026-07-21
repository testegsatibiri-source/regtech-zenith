# Sprint H8-BO — Compliance OS Platform (Backoffice) · Revisão final v3

Os 5 refinamentos foram aceitos integralmente. O ponto mais importante: **a UI nunca conhece o `CountryRuntime` diretamente**. Passa por 3 camadas — HTTP → Application Service → Runtime.

## Arquitetura em camadas

```text
Platform UI (React)
      ↓  useServerFn
Platform HTTP API           ← createServerFn (thin, valida input + auth)
      ↓
Platform Application Service ← lógica de negócio (reutilizável por CLI, jobs)
      ↓
PermissionService (Policy → Decision)   +   CountryRuntime   +   Supabase
```

- **UI:** consome apenas server fns em `src/lib/platform/api.functions.ts`. Sem imports de `@/sdk/*`.
- **HTTP API (thin):** valida `data` (Zod), monta `PolicyContext` (actor, país-alvo, ambiente, correlation_id), delega ao Application Service, mapeia erros.
- **Application Service:** `src/lib/platform/service/*.ts` (packs, releases, parameters, audit, dashboard, flags). Recebe `context` via DI (não importa `supabase` global). Reutilizável por qualquer front-end futuro.
- **PermissionService:** avalia `Policy` (regras) sobre `Role + PolicyContext` retornando `Decision { allow, reason }`. Preparado para escopos futuros (empresa, região, produto, ambiente) — hoje decide só por role + country scope, mas a assinatura já leva o `context` completo.

## Módulos entregues (P0)

### `/platform` — Dashboard
Indicadores via `dashboardService.snapshot()`: packs instalados/degradados, health médio, releases pendentes por estado, parâmetros pendentes de review/approve, Conformance Score por país, últimos 10 eventos de audit.

### `/platform/packs` — Platform Administration
Lista packs (via service, não runtime direto). Ações: Install, Reinstall, Uninstall, Rollback, Toggle Feature Flag. Cada ação passa por `permissionService.check("pack.install", ctx)` etc.

### `/platform/countries/$code` — Country Administration
- **Parameters:** **read-only**, com banner destacado:
  > **Read Only** · Runtime Source: Country Pack `v1.8.0` · Migration planned (DEBT-022)
  Permitido: view, diff entre versões, import (cria `draft`), export JSON, histórico.
- **Calendar:** CRUD templates (auditado).
- **Translations:** editor JSON por locale (auditado).
- **Rules:** read-only (ruleset + interfaceVersion + effective date do runtime record).

### `/platform/releases` — Release Center
Workflow completo de 6 estados: `draft → candidate → approved → released → deprecated → archived` (+ `rolled_back` como transição especial de `released`). Cada transição chama `releaseService.transition(from, to, ctx)` que valida gates (Conformance/Validator/Health) antes de `approved → released`.

### `/platform/developer` — Developer Center
Cards linkando OpenAPI, Country Pack Spec, ADRs (0001-0008), Architecture Freeze, Test Kit, PR templates.

### Stubs "Coming Soon"
`/platform/monitor`, `/platform/governance`, `/platform/audit`, `/platform/marketplace`.

## Migração SQL única

- **Enum `app_role`:** `+ platform_admin, country_cto, platform_operator, platform_auditor`.
- **`country_cto_scopes(user_id, country_code)`** — PK composta.
- **`regulatory_parameters`** (schema pronto para DEBT-022, hoje nenhuma linha vira `active` via UI):
  `id, country_code, parameter_key, payload jsonb, effective_from, effective_to, version int, status enum('draft','review','approved','active','superseded','archived'), author, reviewed_by/at, approved_by/at, activated_by/at, checksum, timestamps`.
  Trigger: apenas um `active` por `(country, key)`.
- **`pack_installations`:** `id, country_code, pack_version, status enum('draft','candidate','approved','released','deprecated','archived','rolled_back'), installed_from, installed_core_version, installed_sdk_version, runtime_version, manifest_checksum, manifest_signature, installed_by, approved_by/at, released_by/at, deprecated_by/at, archived_by/at, rollback_of, notes, timestamps`.
- **`pack_feature_flags`:** `id, country_code, flag, enabled, rollout_percentage (0-100), environment enum('preview','production','all'), effective_from/to, updated_by/at`.
- **`platform_audit_log`:** `id, actor, action, target, country_code, component, old_value jsonb, new_value jsonb, correlation_id, request_id, payload, at`.
- Helpers `SECURITY DEFINER`: `is_platform_admin()`, `is_country_cto(code)`, `is_platform_operator()`, `is_platform_auditor()`.
- RLS + GRANTs (`authenticated` + `service_role`, sem `anon`) em todas as novas tabelas.

## Novos arquivos de código

```text
src/lib/platform/
  policy/
    types.ts             # Policy, PolicyContext, Decision
    policies.ts          # catálogo de policies (pack.install, release.approve, ...)
  permissionService.ts   # PermissionService.check(action, ctx): Decision
  service/
    packs.ts             # packsService.list/install/rollback (usa runtime + supabase)
    releases.ts          # releasesService.list/transition (gates conformance/validator/health)
    parameters.ts        # parametersService.list/diff/import/export (read-only sobre runtime)
    audit.ts             # auditService.list/record
    dashboard.ts         # dashboardService.snapshot
    flags.ts             # flagsService.list/set
    context.ts           # buildPlatformContext(request) → PolicyContext + correlation_id
  api.functions.ts       # createServerFn wrappers (thin, chama services)

src/routes/_platform/
  route.tsx              # ssr:false, beforeLoad valida qualquer platform_* / country_cto
  index.tsx              # dashboard
  packs.tsx
  countries.$code.tsx    # 4 abas via search params
  releases.tsx
  developer.tsx
  monitor.tsx | governance.tsx | audit.tsx | marketplace.tsx (stubs)

src/components/platform/
  PlatformShell.tsx      # layout + sidebar (tema distinto)
  ReadOnlyBanner.tsx
```

Todas as rotas `/platform/*` incluem `robots: noindex, nofollow` no `head()`.

## Governança e docs

- **ADR-0006** — Backoffice as separate product surface (Platform vs Customer).
- **ADR-0007** — Regulatory Parameters versioning + workflow completo (schema-only nesta sprint).
- **ADR-0008** — **Platform Application Service Layer**: toda operação administrativa passa por serviço; HTTP e UI são camadas finas; futuros CLIs/jobs consomem o mesmo serviço.
- `docs/governance/permission-matrix.md` — adiciona as 4 roles e conceito Policy → Decision.
- `docs/tech-debt.md`:
  - **DEBT-022 (P1):** Runtime consome `regulatory_parameters` (destrava edição no Backoffice).
  - **DEBT-023 (P1):** UI real de Monitor/Governance/Audit/Marketplace.
  - **DEBT-024 (Deferred):** Extrair `/platform` para repo próprio.
  - **DEBT-025 (P2):** `company_settings` no produto cliente (Customer Configuration).
  - **DEBT-026 (P2):** UI de gestão de `platform_operator`/`platform_auditor`.
  - **DEBT-027 (P2):** `manifest_signature` real (assinatura criptográfica).
  - **DEBT-028 (P1) — NOVO:** `ConfigurationService` resolvendo parâmetros em cascata (Runtime → DB override → Feature flag → Env). Providers passam a solicitar parâmetros ao serviço em vez de importar direto.

## Testes

- `permissionService` — matriz roles × ações × contextos (com/sem country scope).
- `releasesService.transition` — grafo completo de transições válidas/inválidas; gates falhando bloqueiam `approved → released`.
- `parametersService` — importar não muda estado ativo; export/diff funcionam.
- Trigger `only_one_active_per_key` — falha ao inserir 2 ativos.
- Guard `/platform/*` — nega usuário sem role.
- Isolamento `country_cto` — CTO da Indonésia não vê PH.

## Métricas de sucesso

| Métrica | Meta |
|---|---|
| Arquivos alterados em Core/SDK/Runtime/Packs | **0** |
| Novos arquivos em `src/routes/_platform/` | ~11 |
| Novos arquivos em `src/lib/platform/` | ~10 (policy + services + api) |
| Novas tabelas | 5 |
| ADRs novos | 3 (0006, 0007, 0008) |
| Novos débitos registrados | 7 (DEBT-022 → 028) |
| Imports de `@/sdk/*` em rotas/componentes de `/platform` | **0** |

## O que **não** faço

- Não torno `regulatory_parameters` fonte oficial (DEBT-022).
- Não altero nada em Core/SDK/Runtime/Packs.
- Não implemento ConfigurationService (DEBT-028) — apenas registro no backlog.
- Não implemento Marketplace, Monitor, Governance, Audit Center reais.
- Não implemento assinatura criptográfica real (aceito `null` na coluna).
- Não extraio Backoffice para repo separado.
- Não crio Customer Configuration.

Pronto para executar assim que aprovar.
