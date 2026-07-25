# ADR-0028 — Knowledge Freshness Policy

- **Status:** Accepted (Sprint H12.5 Bridge)
- **Date:** 2026-07-27
- **Deciders:** Platform

## Context

The UADA Knowledge Store must reflect the current state of the repository,
database schema, and ADRs. Without a freshness policy, operators cannot tell
when a reindex is needed, whether an incremental pass is safe, or when a new
snapshot should become active.

## Decision

### Triggers for a new snapshot

A new snapshot is created when any of the following occurs:

1. **Model change** — the embedding model or its dimensions changed.
2. **Schema change** — the hash of `information_schema` + `pg_proc` + RLS
   policies differs from the active snapshot's recorded schema hash.
3. **Manual rebuild** — an operator invokes `reindex()` with reason `manual`.
4. **Corruption detected** — integrity checks fail on the active snapshot.

These map directly to `RebuildPlan.reason` defined in
`contracts/snapshot/policy.ts`.

### Incremental vs full reindex

- **Incremental**: only files whose `mtime` or content hash changed since the
  active snapshot's `last_indexed_at` are reindexed. Safe for routine updates
  when the embedding model and schema have not changed.
- **Full**: required for all four triggers above. A full reindex always creates
  a new `building` snapshot and never modifies the active snapshot in place.

Incremental reindex must not cross snapshot boundaries. If the active
snapshot was built with a different model or schema, the incremental pass is
rejected and a full reindex is required.

### Promotion criteria (`building → active`)

A snapshot may be promoted only when:

- Readiness report is OK.
- Coverage is 100% of known artifact types: tables, columns, RPCs, RLS
  policies, indexes, migrations, ADRs, routes, server functions, and packs.
- Zero PII detected in indexed documents.
- Semantic search smoke tests pass with precision@5 ≥ 0.8 on reference queries.
- Exactly one snapshot is promoted; the previous active snapshot is atomically
  moved to `archived`.

### Retention

Retention follows `DEFAULT_RETENTION` from ADR-0026:

- 1 active snapshot at any time.
- Up to 10 archived snapshots kept.
- Active snapshots older than 30 days are auto-archived on the next pass.
- Archived snapshots older than 180 days are purged.

### Freshness SLA

- In H13, incremental reindex is triggered on-demand only.
- Scheduled/automatic incremental reindex is out of scope for H13 and will be
defined in H14+.

## Consequences

- **+** Freshness decisions are explicit and traceable.
- **+** Rebuilds are first-class operations with clear triggers.
- **+** Operators can safely time-travel via archived snapshots.
- **−** Promotion criteria add gatekeeping overhead that must be automated.
- **−** Schema hashing must be kept accurate as Postgres extensions evolve.
