# UADA Graph Schema Policy

Companion to `ADR-0026` (Snapshot Lifecycle). Frozen at H13.5, before the
Planner (H14) starts consuming the graph.

```text
GRAPH_SCHEMA_VERSION = "v1"
```

The constant lives in `src/lib/uada/contracts/graph/version.ts` and is stamped
on every snapshot at `uada_snapshots.graph_schema_version`.

## Kinds covered in v1

`table`, `column`, `rpc`, `route`, `component`, `policy`, `index`, `adr`,
`document`, `server_fn`, `hook`, `provider`, `migration`.

## Compatible changes (do NOT bump the version)

- New free-form field inside a node/edge `metadata` jsonb.
- New optional edge between kinds already in v1.
- Physical index/tuning that does not change semantics.

## Incompatible changes (bump `v1` → `v2`)

- Adding a new `kind` of node.
- Making an edge that used to be optional required.
- Removing a metadata field that an engine reads.
- Changing the semantic meaning of an existing kind.

## Reader behavior (H14+)

Every consumer compares its runtime `GRAPH_SCHEMA_VERSION` with the
`graph_schema_version` recorded on the active snapshot:

- **Equal** → use directly.
- **Snapshot older, adapter registered** → adapt in-memory.
- **Snapshot older, no adapter** → surface a "reindex required" banner in
  `/platform/uada` and refuse to serve engines that depend on the new schema.
- **Snapshot newer than reader** → reader must upgrade; fail closed.

## Bump procedure

1. Add a new adapter in `src/lib/uada/contracts/graph/adapters/`.
2. Bump `GRAPH_SCHEMA_VERSION`.
3. Trigger a full reindex (reason: `schema_change`).
4. Update this document and reference the change in an ADR.
