# ADR-0029 — Context Assembly & Inference Principles (UADA H14)

Status: Accepted — H14
Supersedes: none. Extends ADR-0020, ADR-0025, ADR-0027.

## Context

H13/H13.5 delivered the Knowledge Store, Graph Store, indexers and snapshot
lifecycle. H14 adds reasoning surfaces (Search, Impact, Plan). Without explicit
boundaries every engine would grow its own retrieval logic, making answers
non-reproducible and evidence unverifiable.

## Decision

### 1. Context Assembly Principle

`ContextAssembler` is the ONLY component allowed to read `KnowledgeStore`,
`GraphStore` or `MemoryStore`. Engines receive a `ContextBundle` and never
query the database.

- Input: `ContextRequest` (objective, snapshot version, budgets, toggles).
- Output: `ContextBundle` (documents, nodes, edges, memory, evidence, metrics,
  `bundleHash`).
- Determinism: same request + same snapshot => byte-identical bundle.
  Guaranteed by stable score rounding (4 decimals) and total orderings
  (score desc, then path/id asc). Timing metrics are excluded from the hash.
- Telemetry: `ContextMetrics` records documents, nodes, edges, estimated
  tokens, assembly/expansion/embedding latency.

### 2. Inference Principle

Engines never call `ModelRouter` or the AI Gateway directly. `InferenceService`
owns model selection, prompt composition, budgets, retries and failure
mapping (429 / 402 surfaced to the caller).

### 3. Engine boundaries

| Engine | Reads | Uses model | Notes |
| --- | --- | --- | --- |
| Search | ContextBundle | no | Pure retrieval + optional graph-proximity rerank |
| Impact | ContextBundle (anchors) | no | Deterministic traversal with `EdgeConfidence` |
| Planner | ContextBundle | yes | Structured `Plan` artefact only |

Search is deliberately model-free so it stays reproducible and benchmarkable.

### 4. Evidence

Every engine response passes `assertEvidenceComplete`. Evidence carries
`source`, `path`, `score`, `snapshotVersion` and `evidenceHash`. Missing
evidence forces confidence to 0 — the system never invents.

### 5. Read-only

H14 engines perform no writes other than benchmark result rows. No code
generation, no migrations, no mutations to product tables.

## Consequences

- Retrieval changes happen in one file, benefiting all engines.
- Benchmarks compare snapshots because Search is deterministic.
- Adding an engine (H15 Review, H16 Audit) means composing a `ContextRequest`,
  not writing new SQL.
