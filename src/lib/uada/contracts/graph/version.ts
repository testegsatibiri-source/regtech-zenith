// H13.5 — Graph schema version constant, mirrored in docs/uada/graph-schema-policy.md.
// Bump per that policy: new `kind`, required edge, or breaking metadata removal → v2.
export const GRAPH_SCHEMA_VERSION = "v1" as const;

export const GRAPH_SCHEMA_KINDS_V1 = [
  "table",
  "column",
  "rpc",
  "route",
  "component",
  "policy",
  "index",
  "adr",
  "document",
  "server_fn",
  "hook",
  "provider",
  "migration",
] as const;

export type GraphSchemaKindV1 = (typeof GRAPH_SCHEMA_KINDS_V1)[number];
