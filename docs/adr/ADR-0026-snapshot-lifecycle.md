# ADR-0026 — UADA snapshot lifecycle & retention

- **Status:** Accepted (Sprint H12.5)
- **Date:** 2026-07-27
- **Deciders:** Platform

## Context

The UADA Knowledge Store versions its indexed view of the codebase via
snapshots. Without an explicit lifecycle, snapshots accumulate forever, the
"active" concept becomes ambiguous, and rebuilds turn into ad-hoc scripts.

## Decision

Snapshots follow an explicit state machine and retention policy.

### States

```text
building ──► active ──► archived ──► deprecated
     └──────────────────────────────┘
```

- **building** — indexer running; not yet queryable.
- **active** — exactly ONE at a time; serves all reads.
- **archived** — retained for diff/history; readable by callers that opt in.
- **deprecated** — scheduled for purge on next retention pass.

Invalid transitions throw `InvalidSnapshotTransition`.

### Retention (defaults)

| Setting | Default | Meaning |
|---------|---------|---------|
| `keepActive` | 1 | Invariant — a second active snapshot is a bug. |
| `keepArchived` | 10 | Newest N archived snapshots kept. |
| `archiveAfterDays` | 30 | Active snapshot older than N is auto-archived on the next pass. |
| `purgeAfterDays` | 180 | Archived snapshots older than N are purged. |

`applyRetention()` is a **pure** function returning `{ keep, archive,
purge }`. The store applies the outcome; the policy has no side effects.

### Rebuild

`RebuildPlan { reason, targets }` triggers a full rebuild from repo +
schema. Indexation is deterministic (same commit + schema + model →
identical snapshot), so a rebuild is always possible without external
state.

## Consequences

- **+** Storage bounded and predictable.
- **+** "Active" is unambiguous, making time-travel queries (against
  archived snapshots) safe to add later.
- **+** Rebuild is a first-class operation, not a fire drill.
- **−** Callers that pin to an archived snapshot must handle purge windows.
