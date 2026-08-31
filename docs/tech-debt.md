# UBoard Asia — Compliance OS · Technical Debt Register

_Last audit: 2026-08-28 (Sprint H22 Phase C — PH 201 File + Solo Parent ID completed)._



## H22 delivered (PH HR Track — Phase A)

| Area | Item | Status |
|------|------|--------|
| SDK | `src/sdk/providers/SeparationProvider.ts` — pure contract for grounds, separation pay, final pay, requirements | ✅ |
| SDK | `Capability` adds `separation`; `EXPECTED_INTERFACES` and `validator.ts` wired | ✅ |
| Pack PH | `src/packs/philippines/engines/separation.ts` — Arts. 297, 298, 299 grounds, Twin Notice, DOLE 30-day advance, Final Pay deadline | ✅ |
| Pack PH | `params.ts` separation constants + version bump to v1.4.0 / PH-2024.4 | ✅ |
| Pack PH | Re-signed manifest (`signature.ts`) + DB key rotation for `uboard-ph` / `platform-cto-ph` | ✅ |
| Core | `src/lib/separation.functions.ts` — `listSeparationGrounds`, `computeFinalPay` server functions with RLS auth | ✅ |
| UI | `/separations` route + AppShell nav item for final-pay calculation | ✅ |
| QA | `src/packs/philippines/__tests__/separation.test.ts` — 156 tests passing | ✅ |

## H22 delivered (PH HR Track — Phase B)

- `LeaveProvider` added to the SDK (`leave` capability now has a real provider slot; validator maps it).
- PH engine `engines/leave.ts`: SIL (Art. 95), Expanded Maternity (RA 11210, 105/120 days + salary differential), Paternity (RA 8187, first 4 deliveries), Solo Parent (RA 8972/RA 11861), VAWC (RA 9262), Gynecological (RA 9710). Only SIL converts to cash.
- Final pay now resolves the SIL accrual from the LeaveProvider; the Fase A incompleteness boundary is preserved for packs without a leave engine.
- Core: `leave_balances` and `leave_requests` tables (RLS + GRANTs), `src/lib/leave.functions.ts`, route `/leave`.
- Pack PH bumped to v1.5.0 / PH-2024.5 and re-signed (trust store updated).

## H22 delivered (PH HR Track — Phase C)

- Core tables `employee_dependents` and `employee_job_history` (RLS + GRANTs) and `src/lib/personnel.functions.ts` (CRUD + `getEmployeeDossier`).
- `PH-201-FILE` completeness checklist: statutory identifiers, hire date, contract, job/salary history, dependents and — when claimed — a valid Solo Parent ID.
- `engines/identifiers.ts` gains `validatePhSoloParentId` (RA 8972 as amended by RA 11861: ID number + yearly validity).
- `engines/leave.ts` now gates the 7-day parental leave AND the 120-day maternity uplift on a **non-expired** Solo Parent ID instead of a boolean flag.
- `updateSoloParentStatus` server fn + `/personnel` UI to capture the ID number and expiry.
- Pack PH bumped to v1.6.0 / PH-2024.6 and re-signed (trust store rotated); 170 tests passing.

**H22 Phase D preview (next sprint):** Data Privacy Act (RA 10173) — consent register, retention policy and access log over the 201 File; plus the remaining DOLE reports. `commercialReady` for PH stays `false` until Phase 5 (pilot filing upload) and the privacy layer close.

_Superseded preview:_ **H22 Phase C preview (next sprint):** 201 File — `employee_dependents`, `employee_job_history`, Solo Parent ID validity, and the `PH-201-FILE` completeness heuristic. `commercialReady` for PH stays `false` until Phase C closes the dependent-based tax exemption gap.



## H11 delivered


| Area | Item | Status |
|------|------|--------|
| Boot | `src/sdk/boot.ts` — Boot Health Gate (gates → registry → matrix → signatures → health) + Readiness Report | ✅ |
| Boot | `runtime_boot_reports` history table + `/api/public/v1/readiness` + `/platform/readiness` UI | ✅ |
| Gates | `platform_feature_gates` table + `src/sdk/feature-gates.ts` (5 gates seeded per-env) | ✅ |
| Matrix | `src/sdk/compatibility-matrix.ts` — Compatibility Matrix v1.0 + `checkMatrix()` | ✅ |
| Compat | `CompatibilityService` v1.0.0 engine — engineVersion + matrixVersion in every report | ✅ |
| Compat | `compatibility_reports` history table | ✅ |
| Sig | `src/sdk/signature-rejection.ts` — 8 structured rejection codes wired through CompatibilityService | ✅ |
| Freeze | `PACK_INTERFACE_VERSION = "1.0.0"` + validator enforcement (warn today, error in H12) | ✅ |
| Freeze | `docs/governance/country-pack-interface-v1.md` — frozen contract doc | ✅ |
| Events | `RuntimeBootCompleted@1`, `PackRegistryDivergence@1`, `BootstrapRemoved@1` added to catalog | ✅ |
| Docs | ADR-0016 (Boot Gate) · ADR-0017 (Compat versioning) · ADR-0018 (Interface v1) · ADR-0019 (Feature Gates) | ✅ |

**H11.2 preview (next sprint):** flip `registry_enabled=on` in production after 14 days of 0 divergences; enable `PACK_SIG_ENFORCE=enforce` in production; remove `bootstrap.ts` once `scripts/verify-h11-ready.ts` confirms all preconditions.



## H10 delivered

| Area | Item | Status |
|------|------|--------|
| IAM | `role_capabilities` table + seed + `has_capability()` DB helper + local `src/lib/platform/capabilities.ts` mirror | ✅ |
| IAM | `platform_invitations` table (7-day expiry, admin-only management) | ✅ |
| MKT | `pack_registry` + `pack_lifecycle_events` + 8-state enum (`experimental`→…→`archived`) | ✅ |
| MKT | `src/sdk/lifecycle.ts` — state machine + transition guards | ✅ |
| MKT | `src/sdk/compatibility.ts` — CompatibilityService (core + validator + deps + signatures × TrustPolicy) | ✅ |
| Sig | `trust_policies` table (preview/staging/production) + `pack_signing_keys` (algo, capabilities, provider) | ✅ |
| Sig | `src/sdk/trust-policy.ts`, `src/sdk/trust-store.ts` (Memory + DbTrustStore), `src/sdk/signing.ts` (Ed25519 Web Crypto) | ✅ |
| Cfg | `src/sdk/config.ts` — `ConfigProvider` interface + `ConfigService` + `StaticConfigProvider`; wired into `ProviderContext.config` | ✅ |
| Obs | `metrics_events.layer` (`runtime|api|database|packs|business`) + index; `metrics_export_log` for hot→cold | ✅ |
| Obs | `src/lib/observability/sink.ts` (MetricSink registry) + `PostgresSink` + `FileSink` stub | ✅ |
| Obs | `incidents` + `postmortems` tables; `alert_rules` + `alert_notifications` + `alert_escalations` + `alert_incidents`; `alerts.ts` dispatcher (Slack/Email/Webhook functional; SMS/WhatsApp/PagerDuty stubs) | ✅ |
| Docs | ADR-0010 … ADR-0015 | ✅ |

**H11 preview:** remove `bootstrap.ts` (registry-only), Version Compatibility Matrix, signature enforcement in production, capabilities editor UI.



## Classification (H7-Gov)

Fixed taxonomy — every debt item MUST carry exactly one of these tags:

| Tag         | Meaning                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| **P0**      | Blocks production launch. Fix before GA.                                   |
| **P1**      | Blocks the next country expansion or a signed customer commitment.         |
| **P2**      | Post-GA polish. Nice to have within 1–2 sprints after launch.              |
| **P3**      | Backlog. Real debt, but no dated pressure.                                 |
| **Deferred**| Valid work, timeboxed out of the current phase by explicit decision.       |
| **Won't Do**| Rejected. Keep the entry with the rejection reason so it isn't re-proposed.|

Anything not tagged is not tracked — either tag it or delete it.

## H6 delivered

| Area | Item | Status |
|------|------|--------|
| DI | `src/lib/engines/registry.ts` removed; all API routes + audit + compliance resolve packs via `CountryRuntime` | ✅ |
| SDK | Capability versioning: every provider carries `readonly version`; `EXPECTED_INTERFACES` + `capabilitySatisfies()` enforce same-major + minor floor | ✅ |
| SDK | Manifest expanded: `provides` / `requires` / `events{emits,consumes}` / `permissions` / `features` / `dependencies` / `signature` / `lifecycleHooks` (declarative only for perms and signature) | ✅ |
| SDK | `ProviderContext` (`src/sdk/context.ts`) — siblings + foreign lookup injected by Runtime; providers no longer import siblings by path | ✅ |
| SDK | Compatibility Validator (`src/sdk/validator.ts`) — plugged into `CountryRuntime.install()`; errors block install, warnings mark pack `degraded`; emits `CountryPackValidated@1` | ✅ |
| SDK | `CountryPack.health?()` optional runtime self-check; Indonesia ships 6 checks incl. live smoke tests; Runtime exposes `health(code)` + emits `CountryPackHealthChecked@1` | ✅ |
| Test Kit | `src/sdk/testkit/` — `runManifestSuite`, `runTaxProviderSuite`, `runBenefitsProviderSuite`, `runIsolationSuite` + Indonesia fixtures | ✅ |
| Packs | Indonesia pack updated (v1.8.0) with all new manifest fields, provider versions, and health check; Malaysia stub adopts new shape | ✅ |
| UI | `/country-packs` shows validator report, health checks, provider versions, events, permissions, features, signature status | ✅ |
| Ops | `CORE_VERSION` bumped 2.0.0 → 2.1.0 (backward-compat additions) | ✅ |
| Governance | ADR-0003 · ADR-0004 · ADR-0005 · `country-pack-spec.md` rewritten | ✅ |

## H7-Gov delivered

| Area | Item | Status |
|------|------|--------|
| Governance | `docs/architecture/repository-strategy.md` — monorepo now + explicit exit criteria | ✅ |
| Governance | `docs/governance/permission-matrix.md` — Edit / Review / Merge / **Approve Release** | ✅ |
| Governance | `docs/governance/architecture-freeze.md` — frozen SDK/Runtime/Events + v3.0 criteria | ✅ |
| Governance | `docs/governance/release-process.md` — Component Versioning + Release Gates | ✅ |
| Governance | `docs/governance/contribution-guide.md` — ADR gate before merge | ✅ |
| CI | `.github/CODEOWNERS` — covers Core, SDK, packs, governance, architecture, `docs/adr/` | ✅ |
| CI | `.github/pull_request_template.md` — ADR gate + release gate checkboxes | ✅ |
| CI | `.github/workflows/{ci-shared,ci-core,ci-sdk,ci-packs,ci-docs}.yml` — 4 pipelines + shared setup, bun runner | ✅ |
| Debt | This file — fixed P0/P1/P2/P3/Deferred/Won't Do taxonomy | ✅ |

## Closed by earlier sprints
- **DEBT-001** [H6] — Wire callers to DI; all callers read via `CountryRuntime`.
- **DEBT-005** [H6] — AI audit reads params from Runtime.
- **DEBT-019** [PH-Validation] — `legacy-bridge` removed; `compliance.ts` resolves rules/params/rulesetVersion directly from `CountryRuntime.get(code)`.

---

## Outstanding debt (reclassified)

### P0 — Blocks production launch
- **DEBT-002 · Snapshot hashing on payroll finalize.** Schema columns exist but `finalizePayrollRun` writes `NULL`. Required for auditability under UU PDP.
- **DEBT-003 · API key management UI.** `api_keys` table is live; no admin surface to mint/revoke. Ship `/settings/api-keys`.

### P1 — Before adding the 2nd country pack (or public rollout)
- **DEBT-006 · N+1 in `runComplianceAudit` and `listObligations`.** Rewrite as single join / RPC or batched `.in(...)` — target < 300ms at 500 employees.
- **DEBT-007 · Score cache invalidation.** `companies.score_cache` unused. Wire to `PayrollFinalized@1`, `ObligationStatusChanged@1`, `ContractChanged@1`.
- **DEBT-008 · CORS refinement for keyed callers.** v1 routes still return `*`; switch to per-key `allowed_origins`.
- **DEBT-017 · Country Pack Lifecycle (Sprint H7-Lifecycle).** State machine `Installing → Validating → Initializing → Ready → Deprecated → Disabled → Failed`, `lifecycleHooks` wiring, persistence, rollback UI.

### P2 — Post-GA polish
- **DEBT-009 · Move ID params to a `regulatory_parameters` table.** Enables `Regulatory Update Service` hot-swap without deploy.
- **DEBT-010 · Persist metrics to `metrics_events`.** Async batched writer for durable analytics.
- **DEBT-012 · Legacy alias sunset.** Remove `/api/public/calculate-tax` and `/calculate-bpjs` on 2026-10-15 per `Sunset` header.
- **DEBT-014 · Test Kit coverage for Calendar / Contract / Payroll providers.** Add parametric suites + country fixtures.
- **DEBT-015 · Enforce `manifest.permissions`.** Field is declarative today; gate provider methods via a capability broker at `contextFor()` time.
- **DEBT-016 · Verify `manifest.signature.checksum`.** Compute canonical hash, reject on mismatch, establish publisher key store.
- **DEBT-020 · i18n `en-PH` / `fil` locale.** Manifest advertises languages, UI copy missing.
- **DEBT-021 · `/country-packs` UI is ID-centric in copy.** Renders PH correctly but labels assume Indonesia terms.
- **DEBT-022 · PH Payroll Correctness — commercial readiness gap.** PH pack v1.1.0 (PH-2024.2) now implements Phase 1 fiscal corrections: SSS RA 11199 stepped table (P1a), 13th-month PD 851 earned base via `annualGrossEarned` (P1b), and BIR ₱90k tax exemption ceiling via `nonTaxableBenefits`/`cumulativeTaxableBenefits` (P1c). NCR regional minimum wage is parameterized (P1d). Phase 2 (statutory identifiers) closed in the same sprint: `engines/identifiers.ts` validates employee TIN/SSS/PhilHealth/Pag-IBIG and the employer registry (TIN+branch, RDO, SSS/PhilHealth/Pag-IBIG employer numbers, persisted in `companies.statutory_metadata`), scored by rule `PH-STAT-IDS` and heuristics `PH-STAT-IDS-COVERAGE` / `PH-STAT-IDS-FORMAT`. Phase 3 (staggered statutory deadlines) closed in Sprint H21: `engines/deadlines.ts` resolves SSS (ER last digit, Circular 2021-005), PhilHealth (PEN last digit, Circular 2020-0025), Pag-IBIG (employer name letter, HDMF Circular 274) and BIR 1601-C (eFPS group RR 26-2002), with weekend/regular-holiday roll-forward and `needs_review` flagging when the employer registry lacks the identifier. `CalendarProvider` gained the optional `CalendarSubject` argument (additive, interface v1 preserved); pack bumped to v1.2.0 / PH-2024.3 and re-signed. Phase 4 (filing exports) closed in Sprint H21: optional SDK capability `filings` + `FilingProvider`, PH generators for BIR 1601-C, BIR 1604-C Alphalist (DAT), SSS R-3, PhilHealth RF-1 and Pag-IBIG MCRF, stored in `statutory_filings` with SHA-256 checksum, `ruleset_version`/`pack_version` stamps, submission receipts and amended-filing path (ADR-0037). Pack re-signed at v1.3.0. **Status:** Phases 1–4 done; `commercialReady` stays `false` until the generated layouts are validated against a real portal upload with a pilot employer (Phase 5).
- **DEBT-023 · Filing immutability vs. retroactive ruleset change.** Filing artifacts (Alphalist DAT, SSS R-3, PhilHealth RF-1, Pag-IBIG MCRF, 2316 PDF) are generated from a specific `rulesetVersion`. If a pack is corrected after an employer already submitted a filing, the original filing must not be silently regenerated/replaced; instead it is marked `stale` and the UI offers an amended/corrected filing path. Introduced in Sprint H21 as prerequisite for the PH FilingProvider. Implemented in Phase 4: submitted filings are immutable at the database level (`enforce_filing_immutability` trigger), ruleset drift flags filings `stale` via `flagStaleFilings`, and the UI offers an amended filing that links back through `amends_filing_id`. **Status:** resolved (ADR-0037); residual work is persisting the per-scheme contribution split on `payroll_items` so filings are reproducible without recomputation (P2).





### P3 — Backlog
- **DEBT-018 · Public API multi-country.** `/api/public/v1/calculate-tax` and `/calculate-bpjs` remain ID-only (fields `maritalStatus`, `hasNpwp`, IDR). Reshape when a real PH/MY API customer exists.
- **DEBT-013 · Read replica for `apiAuth` key lookup.** `supabaseAdmin` is correct; revisit once traffic > 100 rps.

### Deferred
- **Country Pack marketplace.** Deferred until ≥ 3 external maintainers exist (see `docs/architecture/repository-strategy.md` exit criteria).
- **Signature verification hot-path.** Deferred with DEBT-016 until publisher key store is designed.
- **Hot reload / remote plugins.** Deferred to platform v3.0 (see `docs/governance/architecture-freeze.md`).
- **Microservice split of providers.** Deferred to v3.0 isolation criterion.

### Won't Do
- **DEBT-011 · Linter WARN 0029 on `has_role`.** Function is intentionally executable by `authenticated` because RLS policies elsewhere call it inline. Accepted risk; not a defect.

---

## H23-A0 delivered (ID UMP 2026 epistemic update)

- `src/packs/indonesia/params/ump-2026.ts` updated to 38 provinces with 2026 values reported by Kemnaker via CNN Indonesia.
- Every entry carries `sourceStatus: "media-report"` because the exact SK Gubernur figures are still pending; `stale` flags removed.
- `UmpSourceStatus` type added (`official | media-report | stale`) so the engine can distinguish precision levels.
- `ComplianceRule.evaluate` and `Finding` now support an optional `conclusive` flag.
- `ID-UMR-01` reports **non-conclusive** while the source is not `official`; score is not inflated by unverified data.
- Test coverage: `src/packs/indonesia/__tests__/ump.test.ts` (4 tests) locks the epistemic contract.

**Remaining for DEBT-024 close:** reconcile each provincial figure against the official Gubernatorial Decree and flip `sourceStatus` to `"official"` before Indonesia can advance past A0.

## Fast follow-ups (< 1 hour each)
1. Build `/settings/api-keys` route (DEBT-003).
2. Emit `PayrollFinalized@1` inside `finalizePayrollRun` (unlocks DEBT-007).
3. Expand Test Kit with `runCalendarProviderSuite` (DEBT-014).

## Related

- `docs/governance/architecture-freeze.md`
- `docs/governance/permission-matrix.md`
- `docs/governance/release-process.md`
- `docs/governance/contribution-guide.md`
- `docs/architecture/repository-strategy.md`

---

## H22 Phase D — Data Privacy (delivered)

- Tables: `employee_consents` (purpose × legal basis × grant/withdraw evidence, unique per employee/purpose),
  `personal_data_access_log` (append-only trail: actor, action, resource, purpose, metadata),
  `data_retention_policies` (per-company category, retention months, legal reference, purge action).
- `src/lib/privacy.functions.ts`: consent register, access-trail append/read, retention CRUD with a default
  PH-oriented schedule (BIR 10y, DOLE 3y, NPC applicant-data proportionality) and `getPrivacyReadiness`
  (consent 50% / retention 30% / trail 20%).
- `/privacy` route + nav entry; consent changes self-log to the access trail.
- Remaining for PH `commercialReady = true`: automated purge job for expired categories, DOLE reports
  (Rule 1020, RKS Form 5) and the Phase 5 filing pilot with a real employer.
