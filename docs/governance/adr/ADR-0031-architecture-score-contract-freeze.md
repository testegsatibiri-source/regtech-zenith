# ADR-0031 — Architecture Score Contract Freeze

- Status: Accepted
- Date: 2026-08-01
- Sprint: H16.0 / H16
- Supersedes: none
- Related: ADR-0001 (Architecture Principles), ADR-0029 (Context Assembly), ADR-0030 (Review Principle)

## Context

H13 gave UADA memory, H14/H15 gave it operational reasoning. H16 turns it into a
governance instrument: a numeric, comparable measure of architectural integrity.

A score is only useful if the engine, the database, the UI and the tests agree on
what it *is*. Without a frozen contract, four independent definitions drift within
a sprint and the score becomes noise.

## Decision

### 1. The contract is frozen before the engine

`src/lib/uada/contracts/score/index.ts` is the single source of truth for the
dimension names, weights, ranges and the report shape. It ships with a literal
reference payload in `src/lib/uada/contracts/score/examples.ts`, which the tests
assert against. Engine, persistence and UI all consume these types.

### 2. Five dimensions, fixed weights

| Dimension | Weight | Measures |
| --- | --- | --- |
| `coupling` | 0.25 | Share of import/dependency edges that cross a layer boundary |
| `boundary_integrity` | 0.25 | Count of edges in directions the ADRs forbid (pack → core, SDK → pack, UI → `.server`, …) |
| `documentation_coverage` | 0.20 | Share of indexed documents carrying a summary, plus ADR presence (saturating at 20) |
| `knowledge_freshness` | 0.15 | Snapshot age (full marks ≤ 7 days, zero at 45) and embedding health |
| `test_coverage` | 0.15 | Indexed test files relative to governed modules (SDK, packs, UADA) |

Weights MUST sum to exactly 1; a test enforces this. Changing a weight or adding a
dimension requires a new ADR.

### 3. Determinism over inference

The score is computed by pure functions in `src/lib/uada/score/dimensions.ts`:
no clock, no randomness, no model. The reference instant is injected as
`facts.now`. Identical `ArchitectureFacts` always yield a byte-identical report.
No AI Gateway call participates in the score.

### 4. Facts come only from the ContextAssembler

ADR-0029 stands: engines do not touch the stores. `ContextAssembler.assembleArchitecture()`
is the only reader, returning an `ArchitectureFacts` projection (graph nodes/edges,
document metadata, embedding health, snapshot age).

### 5. Persistence is idempotent and per dimension

`uada_score_reports` holds one row per `(snapshot_version, dimension)` with the
score, weight, the overall and the evidence details. Recomputing a snapshot
upserts. Reads are restricted to the platform roles allowed by `is_uada_reader()`.

### 6. Evidence, not opinions

Every dimension emits deterministic evidence strings, surfaced through the standard
`UadaResponse.evidence` envelope with a `uada://score/<version>/<dimension>` path and
an `evidenceHash`. When a snapshot has no indexed graph or documents, the response
carries `insufficient_evidence`, confidence drops to 0 and nothing is persisted.

### 7. Tool bindings

`src/lib/uada/tools/bindings.server.ts` binds Search, Impact, Plan, Review and Score
in the `ToolRegistry` so the Orchestrator (H17) resolves capabilities uniformly
instead of importing engines directly.

## Consequences

- The score is comparable across snapshots; deltas are meaningful.
- A regression in the score is attributable to a specific dimension and evidence line.
- Adding a dimension is deliberately expensive (contract + example + tests + ADR).
- Score quality is bounded by indexer coverage: an incomplete snapshot yields a
  low, honest score rather than an optimistic one.
