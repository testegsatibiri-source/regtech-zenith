
# Análise dos 3 ajustes + política de grafo

Todos aceitos — são de baixo custo e reduzem dívida arquitetural real.

1. **Não usar `hashtext()`** — correto. `hashtext` é interno do Postgres e não é contrato estável entre versões. Troco por par estável `(namespace_id int, repository_id int)` passado a `pg_try_advisory_xact_lock(int4, int4)`. Constantes centralizadas: `NAMESPACE_ID = 1` (default), `REPO_ID = 1` (uboardasia); mapeamento em `src/lib/uada/reindex/lock.ts` para acomodar multi-repo depois sem tocar no orchestrator.

2. **Manifest imutável** — adotado como invariante forte. Regras:
   - Escrito exatamente uma vez, dentro de `activate()`, na mesma transação da promoção.
   - Constraint `CHECK (manifest IS NULL OR state IN ('active','archived','deprecated'))` — só existe manifest depois de promovido.
   - Nenhuma server fn UADA faz `UPDATE ... SET manifest = ...` fora de `activate()`. Guard em code review + teste dedicado que tenta reescrever e espera erro.
   - Benchmarks executados depois da promoção continuam gravando em `uada_benchmark_results` (que já carrega `benchmark_version`); o manifest guarda apenas o snapshot dos benchmarks disponíveis **no momento da promoção**.

3. **`evidenceHash`** — adotado. Adiciono ao contrato `Evidence`:
   ```ts
   evidenceHash: string; // sha256(path + '|' + score + '|' + snapshotVersion + '|' + (snippet ?? ''))
   ```
   Helper `computeEvidenceHash(e)` em `src/lib/uada/contracts/response/hash.ts`. `assertEvidenceComplete`:
   - Recalcula o hash de cada item e rejeita se divergir do fornecido.
   - Rejeita se algum campo obrigatório (`source | path | score | snapshotVersion | evidenceHash`) faltar.
   - `evidence: []` → força `confidence = 0`.
   - `confidence ∉ [0,1]` → lança.

## Política de evolução do grafo (congelada agora)

Novo documento `docs/uada/graph-schema-policy.md`:

```text
GRAPH_SCHEMA_VERSION = "v1"

Kinds cobertos em v1:
  table, column, rpc, route, component, policy, index, adr, document,
  server_fn, hook, provider, migration

Mudanças COMPATÍVEIS (não incrementam versão):
  + novo campo em metadata (jsonb livre)
  + nova aresta opcional entre kinds existentes
  + novo índice/tunning físico

Mudanças INCOMPATÍVEIS (incrementam v1 → v2):
  + novo `kind` de nó
  + aresta obrigatória (contrato mudou)
  + remoção de campo em metadata usado por engine
  + mudança semântica de um kind existente
```

Reader (H14+) compara `GRAPH_SCHEMA_VERSION` corrente com `uada_snapshots.graph_schema_version` do snapshot ativo:
- Igual → usa direto.
- Menor no snapshot → aceita apenas se houver adaptador registrado; caso contrário, sinaliza "reindex requerido" no `/platform/uada`.

Referenciado como adendo no `ADR-0026`.

---

# Plano H13.5 (final) — diff vs. versão anterior

Mantém tudo do plano anterior. Substitui/adiciona apenas:

## Migração — deltas

- `uada_snapshots.manifest jsonb` **+** `CHECK (manifest IS NULL OR state IN ('active','archived','deprecated'))`.
- Constraint auxiliar: `manifest` é `NOT NULL` sempre que `state = 'active'` (enforce imutabilidade pós-promoção via trigger `prevent_manifest_mutation` que bloqueia `UPDATE` de `manifest` quando o valor antigo não é `NULL`).
- (Todos os demais deltas do plano anterior permanecem: `graph_schema_version`, estados de cancelamento, `coverage_detail`, `uada_search_benchmarks`, `uada_benchmark_results`.)

## Contratos

- `src/lib/uada/contracts/response/index.ts`: `Evidence` ganha `snapshotVersion: number` **e** `evidenceHash: string`.
- Novo `src/lib/uada/contracts/response/hash.ts`: `computeEvidenceHash(e)` (Web Crypto SHA-256, hex).
- `assertEvidenceComplete` estendido conforme descrito.

## Lock

- `src/lib/uada/reindex/lock.ts`: exporta `LOCK_NAMESPACE_ID = 1`, `LOCK_REPO_ID = 1`, e helper `withReindexLock(client, fn)` que chama `pg_try_advisory_xact_lock(1, 1)` em transação; se `false`, retorna `already-in-progress` sem criar snapshot.
- Nenhuma dependência de `hashtext`.

## Manifest — pipeline

Em `SnapshotManager.activate()`, tudo em uma transação:
1. Marca ativo anterior como `archived`.
2. Marca alvo como `active`.
3. Chama `buildManifest(snapshotId)` (lê contagens de docs/nodes/edges, `coverage_detail`, `graph_schema_version`, embedding model/dims).
4. `UPDATE ... SET manifest = <json>` — bloqueado por trigger em tentativas subsequentes.
5. Roda benchmarks *após* commit (fora da tx crítica); resultados vão só para `uada_benchmark_results`.

Server fn `getSnapshotManifest(snapshotId)` para leitura + download JSON na UI.

## Documentação

- Novo: `docs/uada/graph-schema-policy.md`.
- Adendo em `ADR-0026`: estados `cancel_requested/cancelling/cancelled`, imutabilidade do manifest, referência à política de grafo.
- Adendo em `ADR-0025`: `snapshotVersion` e `evidenceHash` obrigatórios em `Evidence`; comportamento do guard.
- `docs/tech-debt.md`: mantém `DEBT-UADA-01` (50 benchmarks) e `DEBT-UADA-02` (ContextAssembler no H14).

## Testes — deltas

- `manifest-immutable.test.ts` — `UPDATE` de `manifest` em snapshot já promovido falha (trigger). Duas chamadas a `activate` não sobrescrevem.
- `evidence-hash.test.ts` — hash correto passa; hash divergente rejeitado; item sem `evidenceHash` rejeitado.
- `advisory-lock.test.ts` — usa `pg_try_advisory_xact_lock(1, 1)`; segundo caller vê `false`.
- `graph-schema-policy.test.ts` — constante `GRAPH_SCHEMA_VERSION` bate com o documento (parser simples do markdown ou export duplicado).

## Critérios de aceite — deltas

- Lock funciona sem `hashtext` — API é `pg_try_advisory_xact_lock(int, int)`.
- Snapshot promovido tem `manifest NOT NULL`; qualquer `UPDATE` posterior falha.
- Toda `evidence` produzida na camada UADA passa `assertEvidenceComplete` (hash recomputável e igual).
- `GRAPH_SCHEMA_VERSION` documentado e cravado em cada snapshot.
- Demais critérios do plano anterior mantidos.

## Fora do escopo (reafirmado)

- ContextAssembler → **primeiro deliverable do H14**, antes de qualquer engine consumir Knowledge/Graph diretamente.
- Adaptadores entre versões de grafo → só quando aparecer `v2`.
- Bloquear promoção por benchmark → depois de calibrar thresholds.
