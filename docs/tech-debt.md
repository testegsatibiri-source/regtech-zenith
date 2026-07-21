# UBoard Asia — Compliance OS · Technical Debt Register

_Last audit: 2026-07-20 (Sprint H6 — SDK Hardening: DI, Validator, Test Kit)._

## H6 delivered

| Area | Item | Status |
|------|------|--------|
| DI | `src/lib/engines/registry.ts` removed; all API routes + audit + compliance resolve packs via `CountryRuntime` (`src/lib/engines/legacy-bridge.ts` wraps the Runtime for legacy helpers) | ✅ |
| SDK | Capability versioning: every provider carries `readonly version`; `EXPECTED_INTERFACES` + `capabilitySatisfies()` enforce same-major + minor floor | ✅ |
| SDK | Manifest expanded: `provides` / `requires` / `events{emits,consumes}` / `permissions` / `features` / `dependencies` / `signature` / `lifecycleHooks` (declarative only for perms and signature) | ✅ |
| SDK | `ProviderContext` (`src/sdk/context.ts`) — siblings + foreign lookup injected by Runtime; providers no longer import siblings by path | ✅ |
| SDK | Compatibility Validator (`src/sdk/validator.ts`) — plugged into `CountryRuntime.install()`; errors block install, warnings mark pack `degraded`; emits `CountryPackValidated@1` | ✅ |
| SDK | `CountryPack.health?()` optional runtime self-check; Indonesia ships 6 checks incl. live smoke tests; Runtime exposes `health(code)` + emits `CountryPackHealthChecked@1` | ✅ |
| Test Kit | `src/sdk/testkit/` — `runManifestSuite`, `runTaxProviderSuite`, `runBenefitsProviderSuite`, `runIsolationSuite` + Indonesia fixtures; `bun test src/packs/` → 13 tests green | ✅ |
| Packs | Indonesia pack updated (v1.8.0) with all new manifest fields, provider versions, and health check; Malaysia stub adopts new shape | ✅ |
| UI | `/country-packs` now shows validator report (errors / warnings), health checks (with re-check), provider versions, events, permissions, features, signature status | ✅ |
| Ops | `CORE_VERSION` bumped 2.0.0 → 2.1.0 (backward-compat additions) | ✅ |
| Governance | ADR-0003 (provider isolation) · ADR-0004 (conformance testing) · ADR-0005 (capability versioning) · `country-pack-spec.md` rewritten | ✅ |

## Closed by H6
- **DEBT-001 · Wire callers to DI.** API routes, audit fn, compliance/contracts helpers all read from `CountryRuntime` — no direct `import from @/packs/*` or dead `registry.ts` remains. UI callers still consume legacy engine helpers, which internally read from the Runtime via `legacy-bridge`.
- **DEBT-005 · AI audit params via Runtime.** `audit.functions.ts` now reads `params` from `CountryRuntime.get("ID").params`.

## Explicit non-goals for H6
- No new business modules.
- No DB migrations.
- No Sprint H7 lifecycle state machine (`Installing → Ready → Deprecated → …`) — reserved as its own sprint. `lifecycleHooks` fields exist on the manifest but the Runtime does not read them yet.
- Permission enforcement and signature verification are still declarative (DEBT-015, DEBT-016).




Classification: **P0** = blocks production launch · **P1** = fix before scaling to 2nd country · **P2** = defer to backlog.

---

## Delivered in this hardening pass

| Area | Item | Status |
|------|------|--------|
| H1 — Data | Indexes on every FK; unique constraints for `(company_id, period_start, period_end)` on `payroll_runs` and `(company_id, category, due_date)` on `compliance_obligations` | ✅ |
| H1 — Data | `snapshot_hash`, `ruleset_version`, `ruleset_hash` columns on `payroll_runs`; `input_hash` on `payroll_items` | ✅ |
| H1 — Data | `auditor` role + `is_auditor()` security-definer helper + granular SELECT/INSERT/UPDATE/DELETE policies | ✅ |
| H1 — Data | `api_keys`, `api_usage`, `metrics_events` tables with RLS + service-role grants | ✅ |
| H1 — Data | `companies.score_cache` JSONB for memoised Compliance Score | ✅ |
| H2 — Platform | `CountryPack` contract (`src/lib/engines/types.ts`) — tax/social/13th/compliance engines + `rulesetVersion` | ✅ |
| H2 — Platform | Registry (`src/lib/engines/registry.ts`) — bootstraps Indonesia pack; MY/SG/PH/VN/TH slots open | ✅ |
| H2 — Platform | Compliance engine decoupled from `ID_PARAMS`; rules live inside `id-pack.ts` | ✅ |
| H2 — Platform | Versioned in-process Event Bus (`src/lib/events/bus.ts`) — `PayrollFinalized@1`, `EmployeeUpserted@1`, `ObligationStatusChanged@1`, `ContractChanged@1` | ✅ |
| H2 — Platform | DTO versioning: every public API response carries `schemaVersion` + `rulesetVersion` | ✅ |
| H3 — API Security | Bearer API-key auth with SHA-256 hashed storage (`sk_...`) | ✅ |
| H3 — API Security | Monthly quota via `check_api_quota()` (Postgres, SECURITY DEFINER, timezone-safe month bucket) | ✅ |
| H3 — API Security | Token-bucket rate limit (30 req/min per IP) for anonymous demo callers | ✅ |
| H3 — API Security | Deprecation/Sunset/Link headers on legacy `/api/public/calculate-*` (90-day sunset 2026-10-15) | ✅ |
| H3 — API Security | Versioned routes `/api/public/v1/{calculate-tax,calculate-bpjs,health,openapi.json}` | ✅ |
| H3 — API Security | `/api/public/v1/health` endpoint (no PII, ruleset inventory) | ✅ |
| H4 — Observability | Structured JSON logger + child bindings (`src/lib/observability/logger.ts`) | ✅ |
| H4 — Observability | `timed()` + `counter()` primitives; every engine call is instrumented | ✅ |
| H4 — Observability | Correlation IDs propagated via `x-request-id` header | ✅ |
| H4 — Observability | Per-request `api_usage` persistence with latency + status | ✅ |

---

## Outstanding debt

### P0 — Before production launch
- **DEBT-001 · Wire event bus into mutations.** `data.functions.ts`, `contracts.functions.ts`, `calendar.functions.ts` still perform DB writes without `emit(...)`. Add emissions after every finalize/upsert/status change so downstream consumers (score cache invalidation, audit log) get notified.
- **DEBT-002 · Snapshot hashing on payroll finalize.** Schema columns exist but `finalizePayrollRun` still writes `NULL`. Compute `sha256Hex({items, ruleset, params})` before update; assign `ruleset_version = pack.rulesetVersion`. Required for auditability under UU PDP.
- **DEBT-003 · API key management UI.** `api_keys` table is live but there is no admin surface to mint/revoke keys. Ship `/settings/api-keys` route with server-fn `createApiKey` returning the raw key exactly once. Without it, keyed callers can't onboard.

### P1 — Before adding the 2nd country pack
- **DEBT-004 · [CLOSED in H5] Malaysia scaffold.**
- **DEBT-005 · [CLOSED in H6] AI audit reads params from Runtime.**
- **DEBT-006 · N+1 in `runComplianceAudit` and `listObligations`.** Both fetch employees, then loop over related rows client-side. Rewrite as a single join / RPC or batch with `.in('employee_id', ids)` to keep latency < 300ms at 500 employees.
- **DEBT-007 · Score cache invalidation.** `companies.score_cache` exists but nothing reads or writes it. Subscribe to `PayrollFinalized@1` + `ObligationStatusChanged@1` + `ContractChanged@1` and recompute; dashboard reads from cache first, falls back to compute.
- **DEBT-008 · CORS refinement for keyed callers.** `apiCors.corsHeadersFor` supports per-key `allowed_origins` but v1 routes still return `*`. Switch to `corsHeadersFor(origin, authed.key?.allowedOrigins ?? ["*"])` once keys are in production.

### P2 — Post-GA polish
- **DEBT-009 · Move ID params to Edge Config / config table.** `ID_PARAMS` is a TS constant — every legislative change requires a deploy. Migrate to `regulatory_parameters` table keyed by `(country, version, effective_from)` so `Regulatory Update Service` can hot-swap without deploy.
- **DEBT-010 · Persist metrics to `metrics_events`.** Currently only structured logs; add async batched writer for durable analytics.
- **DEBT-011 · Linter WARN 0029 on `has_role`.** Function is intentionally executable by `authenticated` because RLS policies elsewhere call it inline. Accepted risk.
- **DEBT-012 · Legacy alias sunset.** Remove `/api/public/calculate-tax` and `/api/public/calculate-bpjs` on 2026-10-15 per the `Sunset` header contract.
- **DEBT-013 · SSR bearer for admin-scoped calls.** `apiAuth` uses `supabaseAdmin` for key lookup — correct, but consider a read replica once traffic > 100 rps.

### Opened by H6
- **DEBT-014 · Test Kit coverage for Calendar / Contract / Payroll providers.** Only Manifest / Tax / Benefits / Isolation ship in H6. Add parametric suites + country fixtures.
- **DEBT-015 · Enforce `manifest.permissions`.** Field is declarative today. Runtime should gate provider methods that need e.g. `storage.write` via a capability broker at `contextFor()` time.
- **DEBT-016 · Verify `manifest.signature.checksum`.** Structural check only in H6. Compute a canonical hash of the pack bundle and reject on mismatch; establish publisher key store.
- **DEBT-017 · Country Pack Lifecycle (Sprint H7).** Implement the state machine `Installing → Validating → Initializing → Ready → Deprecated → Disabled → Failed`, wire `lifecycleHooks`, persist state across restarts, expose rollback in `/country-packs`.

---

## Explicit non-goals (this pass)
- No new business modules (Sprints 8–13 remain on roadmap).
- No changes to auth flow, i18n, or UI theming.
- No migration of the AI audit prompt (Gemini 2.5 Flash) — untouched.

---

## Fast follow-ups (< 1 hour each)
1. Emit `PayrollFinalized@1` inside `finalizePayrollRun` (still DEBT-001-adjacent — mutation-side wiring).
2. Build `/settings/api-keys` route (DEBT-003).
3. Expand Test Kit with `runCalendarProviderSuite` (DEBT-014).


## PH validation findings (Sprint PH-Validation, 2026-07-21)

Building the Philippines pack required **zero edits outside `src/packs/philippines/` and `src/sdk/testkit/fixtures/PH.ts`**, with the sole planned exception of the one-line registration in `src/sdk/bootstrap.ts`. Findings surfaced for future work:

- **DEBT-018 · Public API multi-country.** Endpoints `/api/public/v1/calculate-tax` and `/calculate-bpjs` remain ID-only (fields `maritalStatus`, `hasNpwp`, currency IDR). Deferred until a real PH API customer exists — do NOT anticipate this complexity.
- **DEBT-019 · [CLOSED 2026-07-21] `legacy-bridge` removed.** `src/lib/engines/legacy-bridge.ts` deleted. `src/lib/engines/compliance.ts` now resolves `{rules, params, rulesetVersion}` directly from `CountryRuntime.get(code)`; `evaluateEmployee`/`evaluateCompany` take a `CountryCode` (default `"ID"`) instead of a legacy `CountryPack`. Regression covered by `src/packs/philippines/__tests__/compliance-runtime.test.ts` (asserts PH-coded calls return PH `rulesetVersion`). The dead `taxEngine`/`socialEngine`/`thirteenthEngine` fields on the legacy `CountryPack` type remain in `types.ts` because `id-pack.ts` still defines them; nothing else reads them and they can be dropped opportunistically.
- **DEBT-020 · i18n `en-PH` / `fil` locale.** Manifest advertises `supportedLanguages: ["en", "fil"]` but no UI copy exists. Non-blocking.
- **DEBT-021 · `/country-packs` UI is ID-centric in copy.** Renders PH correctly (validator + health) but labels/blurbs assume Indonesia terms. Non-blocking.
