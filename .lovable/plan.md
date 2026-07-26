# Sprint H13 — UADA Knowledge Store, Graph Store & Indexers (v2)

Implementa os contratos da H12.5 sobre Postgres (Lovable Cloud). Read-only, protegido pelo feature gate `uada.enabled` (OFF por padrão). Nada fora de `src/lib/uada/**` importa símbolos UADA.

Incorpora os 5 refinamentos + melhoria de migração + critério de recovery aprovados.

## Escopo (congelado em `docs/uada/h13-acceptance-criteria.md`)

IN: Knowledge Store, Graph Store, SnapshotManager, Indexers (db/code/docs), Graph Builder, Memory Engine, embeddings via Lovable AI Gateway com estado, `reindex()` server function, UI mínima em `/platform/uada`.

OUT: planning, review, audit, docs generation, orchestrator, multi-agent, plugin runtime (H14+).

## Deliverables

### 1. Migração SQL — tabelas `uada_*`

RLS ON em todas; GRANTs restritos a `platform_admin`, `country_cto`, `platform_operator`, `platform_auditor`; sem `anon`. Extensão `vector` habilitada.

- **`uada_snapshots`** — id, version, `state` (`building|active|archived|deprecated`), **`promotion_state`** (`building|validating|promoting|active|failed|archived`, para diagnóstico intermediário — refinamento aprovado), commit_sha, embedding_model, embedding_dimensions, schema_hash, stats jsonb, created_at, activated_at, archived_at, failed_at, failure_reason.
- **`uada_documents`** — id, snapshot_id, path, kind, sha256, summary, metadata jsonb, content text NULL, content_truncated bool, updated_at. Unique (snapshot_id, path).
- **`uada_embeddings`** — id, document_id, snapshot_id, embedding_model, embedding_dimensions, embedding `vector`, **`status`** (`pending|processing|ready|failed`), **`last_embedded_at`**, **`error_message`**, **`retry_count`** (refinamento 2). Índice HNSW parcial por par `(embedding_model, embedding_dimensions)` conforme ADR-0027.
- **`uada_graph_nodes`** — id, snapshot_id, kind, key, label, metadata jsonb. Unique (snapshot_id, kind, key).
- **`uada_graph_edges`** — id, snapshot_id, from_node, to_node, kind, weight, metadata jsonb.
- **`uada_index_runs`** — id, snapshot_id, mode (`full|incremental`), reason, started_at, finished_at, duration_ms, files_scanned, files_changed, docs_upserted, docs_skipped, **docs_denied**, **graph_nodes**, **graph_edges**, **embedding_batches**, **embedding_tokens**, **embedding_cost**, coverage jsonb, ok bool, error text (refinamento 4).
- **`uada_memory`** — id, scope, key, value jsonb, created_at, expires_at.

RLS SELECT: qualquer uma das 4 roles de plataforma. Writes: `platform_admin` + `platform_operator`. Service role para server functions.

### 2. SnapshotManager (refinamento 1 — serviço dedicado)

`src/lib/uada/snapshots/SnapshotManager.server.ts` — extraído do `reindex()` para reuso em H14/H15/H16/H20:

- `createBuilding({ model, dims, commitSha, schemaHash, reason })`
- `activate(snapshotId)` — atômico, promove `building → active` e arquiva o ativo anterior na mesma transação.
- `rollback(targetSnapshotId)` — troca ativa sem reindex, < 1 min.
- `archive(snapshotId)`
- `applyRetention()` — chama helper puro existente da H12.5 e aplica outcome.
- `validatePromotion(snapshotId)` — retorna readiness estruturado exigindo: `coverage == 100%` **E** todos embeddings `ready` **E** grafo válido (sem órfãos) **E** zero PII (refinamento 2).
- Transições `promotion_state` explícitas: `building → validating → promoting → active` ou `→ failed` (refinamento migração).

Fluxo:
```text
reindex() → SnapshotManager → KnowledgeStore / GraphStore
```

### 3. Store implementations (`src/lib/uada/stores/`)

- `pgKnowledgeStore.ts` — implementa `KnowledgeStore` (server-only; `supabaseAdmin` importado dentro dos handlers).
- `pgGraphStore.ts` — implementa `GraphStore`; BFS/DFS via CTE recursiva; `impactOf`, `dependenciesOf`.
- Busca semântica: cosine `<=>` filtrada pelo `(model, dims)` do snapshot ativo; nunca cruza snapshots.

### 4. Indexers (`src/lib/uada/indexers/`)

- `db.ts` — lê `information_schema` + `pg_proc` + políticas RLS via `supabaseAdmin`; emite documents `schema` e nodes (`table`, `column`, `rpc`, `policy`, `index`). PII denylist central bloqueia conteúdo (não estrutura) de `payroll_items`, `employees`, `employment_contracts`, `auth.*`, `storage.*`.
- `code.ts` — **usa TypeScript Compiler API** (refinamento 5). Descarta regex/parser leve. Extrai imports (estáticos, dinâmicos, `import()`), `export default`, barrel exports, lazy imports, decorators, generics, JSX. Emite nodes (`route`, `server_fn`, `component`, `hook`, `provider`) e edges (`imports`, `calls`, `renders`). Motivo: regex quebra em imports dinâmicos e barrels; TS Compiler API produz grafo confiável sem ampliar escopo.
- `docs.ts` — markdown em `docs/**`; emite documents (`adr`, `doc`).

**Manifesto explícito** (refinamento 3) — `src/lib/uada/indexers/manifest.ts` declara os globs cobertos:
```text
src/lib/**
src/routes/**
src/components/**
src/hooks/**
src/providers/**
src/services/**
src/contexts/**
supabase/migrations/**
docs/**
```
Via `import.meta.glob` (Worker-safe) para carregar conteúdo em build time.

### 5. Graph Builder (`src/lib/uada/graph/builder.ts`)

Compõe nodes/edges dos indexers; enforcement de "no orphan" (todo nó tem ≥1 aresta ou é raiz declarada). Falha marca snapshot como `failed`.

### 6. Memory Engine (`src/lib/uada/memory/engine.ts`)

CRUD fino sobre `uada_memory` com scope + TTL. Exportado em `src/lib/uada/index.ts`.

### 7. Embeddings — gateway com estado

Extensão em `src/lib/uada/gateway/aiGateway.server.ts`: `embed(texts, model)` chama Lovable AI Gateway (default `google/gemini-embedding-001`, 3072 dims por padrão do modelo). Fluxo com estado (refinamento 2):

1. Documento novo/alterado → embedding row inserida com `status='pending'`.
2. Worker de batch marca `processing`, chama gateway em batches (≤ 64 itens, ≤ 100 para Gemini), grava vector + `status='ready'` + `last_embedded_at` + tokens.
3. Falha: `status='failed'`, `error_message`, `retry_count++`; retry com backoff em runs seguintes.
4. Promoção rejeitada se qualquer embedding do snapshot não estiver `ready`.

Métricas persistidas em `uada_index_runs` (batches, tokens, cost).

### 8. `reindex()` server function

`src/lib/uada/functions/reindex.functions.ts` — `createServerFn` com `requireSupabaseAuth` + role check (`platform_operator | platform_admin`). Params (Zod): `{ mode: 'full'|'incremental', reason }`.

Fluxo (delegação total ao SnapshotManager):
1. `SnapshotManager.createBuilding(...)` ou reuso do ativo (incremental — rejeita se model/schema mudou, per ADR-0028).
2. Executa db + code + docs indexers → documents (respeitando manifesto e denylist).
3. Embed novos/alterados via gateway com estado.
4. Graph Builder → nodes + edges.
5. `SnapshotManager.validatePromotion()` — falha marca `failed` (não `active`), snapshot descartável.
6. Persiste `uada_index_runs` (com todas as métricas do refinamento 4).
7. `SnapshotManager.activate()` — atômico.
8. `SnapshotManager.applyRetention()`.

Retorno `UadaResponse<{ snapshotId, promotionState, durationMs, coverage, ok }>`.

### 9. UI mínima (`src/routes/platform/uada.tsx`)

Feature-gated por `uada.enabled` (OFF). Mostra: snapshot ativo (id, version, model, dims, indexed_at, stats), `promotion_state` corrente, últimas 10 runs (com batches/tokens/cost/denied), status agregado dos embeddings do snapshot, botão "Reindex" (full/incremental + reason). Padrão loader → `ensureQueryData` → `useSuspenseQuery`.

Entrada de nav em `src/routes/platform/route.tsx` visível apenas com gate ligado.

### 10. Testes (`src/lib/uada/__tests__/`)

- `snapshot-lifecycle.test.ts` — transições `building → validating → promoting → active` atômicas; falha → `failed` sem afetar ativo.
- `retention.test.ts` — cenários de `applyRetention`.
- `pii-denylist.test.ts` — indexar tabela denylistada aumenta `docs_denied` e não vaza conteúdo.
- `graph-orphans.test.ts` — sem órfãos após builder.
- `determinism.test.ts` — dois builds consecutivos em fixture fixo → mesmos hashes de nós/arestas e mesma cobertura (ignorando timestamps/UUIDs).
- `incremental-guard.test.ts` — incremental rejeitado quando model/schema hash diferem.
- **`recovery.test.ts`** (critério aprovado) — falha no meio do reindex: (a) snapshot ativo intocado, (b) snapshot `building`/`failed` é descartável sem intervenção, (c) nenhum estado parcial persiste.
- `ts-parser.test.ts` — TS Compiler API extrai import dinâmico, barrel export, lazy import e default export num fixture.

### 11. Governança

Atualização de `docs/uada/h13-acceptance-criteria.md` com a nova seção **Recovery**:
- Falha durante reindex não altera snapshot ativo.
- Snapshot `building`/`failed` descartável sem intervenção manual.
- Nenhum estado parcial permanece após erro.

Além do checklist "Delivered" ligando cada critério ao teste + migration id que o comprova.

Nenhuma nova ADR necessária — 0020/0025/0026/0027/0028 já cobrem o design.

## Notas técnicas

- `.server.ts` / `.functions.ts` conforme regras de stack; `supabaseAdmin` importado lazy em handlers.
- Coluna `vector` sem dimensão fixa; validação por snapshot (default do modelo escolhido).
- Manifesto usa `import.meta.glob` (Worker não tem FS arbitrário em runtime).
- Boundary check: pequeno script em `ci-core.yml` ("nenhum import de `@/lib/uada` fora de `src/lib/uada`").

## Riscos & mitigações

- **SLO 5 min**: incremental default + batches de embeddings + indexers paralelos.
- **Worker sem FS**: `import.meta.glob` congela manifesto em build.
- **PII acidental**: denylist central + contract test.
- **Feature gate OFF**: UI + reindex checam gate antes de executar; merge dark seguro.
- **Custo TS Compiler API**: aceitável para repo atual; parser reutiliza `Program` entre indexers.

## Critérios de saída

Todos os itens (incluindo nova seção Recovery) verdes em `docs/uada/h13-acceptance-criteria.md`; `bun run typecheck` + `bun test` passam; feature gate OFF por padrão; nenhum import UADA fora de `src/lib/uada/**`.
