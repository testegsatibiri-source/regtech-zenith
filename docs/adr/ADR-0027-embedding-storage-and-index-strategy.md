# ADR-0027 — Embedding Storage & Index Strategy

- **Status:** Accepted (Sprint H12.5 Bridge)
- **Date:** 2026-07-27
- **Deciders:** Platform

## Context

The UADA Knowledge Store indexes code, schema, ADRs, and pack artifacts using
embeddings produced by the Lovable AI Gateway. The gateway may change models or
dimensions over time, and different engines may prefer different trade-offs
between quality, latency, and cost. Without an explicit storage strategy, the
system risks:

- Lock-in to a single vector dimension (e.g. `vector(1536)`).
- Destructive schema changes when swapping models.
- Mixed-dimension snapshots that break semantic search.
- Global indexes that ignore model boundaries.

## Decision

### Multi-dimension storage

The `uada_embeddings` table stores embeddings alongside their metadata:

```text
embedding_model      text    -- e.g. "google/text-embedding-004"
embedding_dimensions int     -- e.g. 768, 1536, 3072
embedding            vector   -- actual vector, dimension set per row
```

A single table supports multiple models and dimensions. HNSW indexes are created
per `(embedding_model, embedding_dimensions)` pair, not globally. Queries are
always scoped to the active snapshot's model/dimension pair.

### Index strategy

- Default: **HNSW** with `m = 16`, `ef_construction = 64`, operator class
  `vector_cosine_ops`.
- Fallback: **IVFFlat** only if HNSW is unavailable in the target Postgres
  extension version.
- Index names follow the convention
  `idx_uada_embeddings_hnsw_<model_slug>_<dims>`.

### Model swap

Changing the embedding model is always a **snapshot-level** operation:

1. Create a new snapshot in `building` state with the new `(model, dimensions)`.
2. Reindex from scratch into that snapshot.
3. Promote the new snapshot to `active` atomically.
4. The previous snapshot remains `archived` and queryable for rollback.

Mixing dimensions inside the same snapshot is forbidden. The
`embedding_model` + `embedding_dimensions` pair is part of the snapshot
metadata and validated at promotion time.

### Dimension migration

Destructive `ALTER` operations on `uada_embeddings.embedding` are prohibited.
If the vector extension or column definition ever needs to change, the path is:
new table → new snapshot → retention of old snapshots per ADR-0026. Existing
data is never mutated in place.

## Consequences

- **+** Model swaps become reversible and auditable via snapshot lineage.
- **+** Multiple engines can coexist with different embedding profiles.
- **+** No destructive schema migrations that block deployments.
- **−** Storage cost temporarily doubles during a rebuild (old + new snapshots).
- **−** Query planning must always filter by model/dimensions; missing filters
  are a correctness bug.
