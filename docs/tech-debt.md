# UBoard Asia — Compliance OS · Technical Debt Register

_Last audit: 2026-07-18 (Hardening sprint H1–H4)._

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
- **DEBT-004 · Malaysia scaffold to prove the contract.** Add stub `my-pack.ts` (empty rules, EPF placeholder) and register it — this exercises `registerPack` and confirms no ID-specific import leaked.
- **DEBT-005 · AI audit still imports `ID_PARAMS` directly.** Refactor `audit.functions.ts` to pull params from `getPack(company.country).params` so audit works for MY/SG without code change.
- **DEBT-006 · N+1 in `runComplianceAudit` and `listObligations`.** Both fetch employees, then loop over related rows client-side. Rewrite as a single join / RPC or batch with `.in('employee_id', ids)` to keep latency < 300ms at 500 employees.
- **DEBT-007 · Score cache invalidation.** `companies.score_cache` exists but nothing reads or writes it. Subscribe to `PayrollFinalized@1` + `ObligationStatusChanged@1` + `ContractChanged@1` and recompute; dashboard reads from cache first, falls back to compute.
- **DEBT-008 · CORS refinement for keyed callers.** `apiCors.corsHeadersFor` supports per-key `allowed_origins` but v1 routes still return `*`. Switch to `corsHeadersFor(origin, authed.key?.allowedOrigins ?? ["*"])` once keys are in production.

### P2 — Post-GA polish
- **DEBT-009 · Move ID params to Edge Config / config table.** `ID_PARAMS` is a TS constant — every legislative change requires a deploy. Migrate to `regulatory_parameters` table keyed by `(country, version, effective_from)` so `Regulatory Update Service` can hot-swap without deploy.
- **DEBT-010 · Persist metrics to `metrics_events`.** Currently only structured logs; add async batched writer for durable analytics.
- **DEBT-011 · Linter WARN 0029 on `has_role`.** Function is intentionally executable by `authenticated` because RLS policies elsewhere call it inline. Accepted risk — documented here so future scans don't re-flag it.
- **DEBT-012 · Legacy alias sunset.** Remove `/api/public/calculate-tax` and `/api/public/calculate-bpjs` on 2026-10-15 per the `Sunset` header contract.
- **DEBT-013 · SSR bearer for admin-scoped calls.** `apiAuth` uses `supabaseAdmin` for key lookup — correct, but consider a read replica once traffic > 100 rps.

---

## Explicit non-goals (this pass)
- No new business modules (Sprints 8–13 remain on roadmap).
- No changes to auth flow, i18n, or UI theming.
- No migration of the AI audit prompt (Gemini 2.5 Flash) — untouched.

---

## Fast follow-ups (< 1 hour each)
1. Emit `PayrollFinalized@1` inside `finalizePayrollRun` (DEBT-001, DEBT-002 together).
2. Build `/settings/api-keys` route (DEBT-003).
3. Register empty `malaysiaPack` to prove multi-country boot (DEBT-004).
