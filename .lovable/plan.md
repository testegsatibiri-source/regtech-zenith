## Objetivo

Hardening de produção do Compliance OS — sem novos módulos de negócio. Foco em integridade de dados, contratos de plataforma multi-país, segurança de APIs, observabilidade e débito técnico.

## Ordem confirmada (revisada)

**H1 → H2 → H3 → H4 → H5.** H2 antes de H3 para estabilizar contratos (`CountryPack`, `rulesetVersion`, `/v1`) antes de endurecer as APIs em cima deles. Também prioriza o eixo de maior valor da plataforma: preparar MY/SG/PH sem refactor espalhado.

---

## H1 — Fundação de dados (integridade + performance)

Reduz risco de corrupção e degradação de queries agora que temos 8 tabelas com apenas PKs.

1. **Índices** (migração única):
   - `companies(owner_id)`
   - `branches(company_id)`
   - `employees(company_id, status)`, `employees(branch_id)`
   - `payroll_runs(company_id, period_year, period_month)`
   - `payroll_items(run_id)`, `payroll_items(employee_id)`, `payroll_items(company_id)`
   - `compliance_findings(company_id, run_id)`, `compliance_findings(company_id, severity, passed)`
   - `compliance_obligations(company_id, due_date, status)`, `compliance_obligations(company_id, category)`
   - `employment_contracts(company_id, employee_id)`, `employment_contracts(company_id, end_date)`
   - GIN em `employees(country_metadata)` para lookups por NIK/NPWP.

2. **Refino de RLS**: substituir cada policy `FOR ALL` única por `SELECT / INSERT / UPDATE / DELETE` separadas, todas via `owns_company()`; reforçar `WITH CHECK (owner_id = auth.uid())` no INSERT de `companies`. Introduzir role `auditor` (enum já existe padrão via `app_role`) com policy `SELECT` cross-company via `has_role(auth.uid(),'auditor')` — sem alterar comportamento do app atual.

3. **Constraints**:
   - `UNIQUE(company_id, period_year, period_month)` em `payroll_runs`
   - `UNIQUE(company_id, code, period_label)` em `compliance_obligations` (idempotência de seed sob concorrência)
   - CHECKs de domínio: `severity IN ('critical','high','medium','info')`, `status` de obrigações e contratos.

4. **Hashes e versionamento de execução**: adicionar `snapshot_hash text`, `ruleset_hash text`, `ruleset_version text` em `payroll_runs`. Adicionar `ruleset_version` em `compliance_findings`. Preencher no `savePayrollRun` (SHA-256 de input + params) para replay determinístico e prova documental em autuação.

---

## H2 — Contratos de plataforma (o eixo mais valioso)

Transforma o Compliance OS em plataforma multi-país. Sem esta camada, MY/SG/PH exigem edições espalhadas.

5. **`CountryPack` interface** em `src/lib/engines/types.ts`:
   ```
   interface CountryPack {
     code: 'ID' | 'MY' | 'SG' | ...;
     rulesetVersion: string;    // ex: 'ID-2024.11.01'
     params: Record<string, unknown>;
     taxEngine: (input) => TaxResult;
     bpjsEngine?: (input) => SocialResult;
     thrEngine?: (input) => ThrResult;
     complianceRules: ComplianceRule[];
   }
   ```
6. **Registry** `src/lib/engines/registry.ts`: `registerPack(pack)`, `getPack(code)`. Registrar `ID` no bootstrap. Refatorar `engines/compliance.ts` e `audit.functions.ts` para receber `pack` em vez de importar `ID_PARAMS` direto. Nenhuma UI depende de engines (confirmado — engines são puros).

7. **Event Bus in-process** `src/lib/events/bus.ts` com tipos versionados: `PayrollFinalized@1`, `EmployeeUpserted@1`, `ObligationStatusChanged@1`, `ContractChanged@1`. Handlers async (recompute score, log de auditoria, invalidação de cache). Interface pronta para trocar por Postgres `NOTIFY` / `pg_net` sem tocar em callers.

8. **Versionamento de DTOs**: toda resposta pública ganha `schemaVersion: '1'` + `rulesetVersion` do pack usado. Payloads internos idem.

9. **`/api/public/v1/*`**: mover `calculate-tax` e `calculate-bpjs` para `/v1/`. Manter `/api/public/calculate-*` como alias com header `Deprecation: true` + `Sunset` (90 dias). OpenAPI `1.0.0` publicado em `/api/public/v1/openapi.json`.

---

## H3 — Segurança das APIs públicas

Agora que `/v1` está estável, blindar.

10. **API Keys**: tabela `api_keys (id, company_id, hashed_key, prefix, scopes[], monthly_quota, created_at, revoked_at, last_used_at)` + `api_usage (key_id, ts, endpoint, latency_ms, status)`. Chaves formato `sk_live_...`; armazenar apenas hash SHA-256 + prefixo para exibição. Middleware em `src/lib/apiAuth.ts` valida `Authorization: Bearer sk_...`.

11. **Quotas e rate limit**: contador diário/mensal em `api_usage`; bloqueio 429 acima da quota. Rate-limit por IP para endpoint demo (sem key) via token bucket em memória (interface trocável por Redis/KV).

12. **CORS refinado**: `Allow-Origin: *` apenas para endpoints demo sem key; endpoints com key ecoam o origin da chave (allowlist por chave). Preflight explícito.

13. **Validação estrita**: limites numéricos (`monthlyGross <= 1e12`), tamanho máximo de body 8KB, rejeitar payload não-JSON com 415.

Nota: gestão de keys via seed SQL nesta fase; UI de gestão fica fora do escopo (não é módulo de negócio, é operacional — pode entrar num H6 futuro).

---

## H4 — Observabilidade

14. **Métricas estruturadas** `src/lib/observability/metrics.ts`: `timed(name, fn)` e `counter(name, tags)`. Instrumentar `calculateTax`, `calculateBpjs`, `evaluateCompany`, `runComplianceAudit`, cada `createServerFn` mutador. Tabela `metrics_events (ts, name, tags jsonb, value_ms, trace_id)` + view SQL agregada por hora.

15. **Correlation ID**: gerar/propagar `x-request-id` no `requestMiddleware` já existente em `src/start.ts`; incluir em todo log.

16. **Structured logging**: substituir `console.error` por logger JSON (`{ level, ts, trace_id, span, engine, ruleset_version, err }`).

17. **Cache de score**: memoize `evaluateCompany` por `(company_id, employees_hash)` no request + coluna `score_cache jsonb` em `companies`, invalidada por eventos do H2 (`EmployeeUpserted`, `PayrollFinalized`, `ObligationStatusChanged`). Métrica hit/miss.

18. **Health endpoint** `/api/public/health` — retorna `{ status, db_latency_ms, ruleset_versions }`, sem PII, para monitoring externo.

---

## H5 — Relatório de débito técnico

19. `docs/tech-debt.md` classificando cada item pendente pós-hardening (P0/P1/P2), com impacto, esforço, risco, arquivos referenciados e proposta de sprint. Inclui: gestão UI de API keys, migração do bus para pg_net/NOTIFY, backend de rate-limit distribuído, cobertura de pack MY/SG, testes de propriedade dos engines, políticas de retenção de `api_usage`/`metrics_events`, revisão de índices após 30 dias de produção via `pg_stat_statements`.

---

## Entregáveis por arquivo

- **Migrações** (4): índices; RLS refinada + role auditor; hashes + constraints; api_keys/api_usage/metrics_events.
- **Novos**: `src/lib/engines/types.ts`, `registry.ts`; `src/lib/events/bus.ts`; `src/lib/observability/{metrics,logger,traceId}.ts`; `src/lib/apiAuth.ts`; `src/routes/api/public/v1/{calculate-tax,calculate-bpjs,openapi[.]json,health}.ts`; `docs/tech-debt.md`.
- **Refatorados**: `engines/compliance.ts` (recebe pack), `engines/indonesia.ts` (exporta pack via registry), `data.functions.ts` / `calendar.functions.ts` / `contracts.functions.ts` (emit eventos + hash), `audit.functions.ts` (usa registry + métricas), `openapiSpec.ts` (v1 + auth scheme + `rulesetVersion`), `apiCors.ts` (allowlist), rotas `/api/public/calculate-*` (aliases deprecated).
- **UI**: nenhuma mudança de negócio; painel `/audit` mostra badge `rulesetVersion` (cosmético).

## Fora do escopo

Nenhum módulo novo (T&A, Portal, Ciclos, Offboarding permanecem no roadmap Sprint 8+). Sem UI de gestão de API keys. Sem troca do bus para infra externa.

Confirme e sigo executando H1 → H2 → H3 → H4 → H5.
