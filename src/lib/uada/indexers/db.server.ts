// H13 — DB schema indexer. Server-only.
// Reads information_schema + pg_policies via supabaseAdmin.
// Emits schema docs and graph nodes. NEVER indexes row content of denylisted tables.
import { PII_DENYLIST } from "./manifest";

export interface DbDoc {
  path: string; // synthetic (e.g. "db://public.employees")
  kind: "schema";
  sha256Input: string;
  summary: string;
  metadata: Record<string, unknown>;
  denied: boolean; // true when the table is PII-denylisted (structure only)
}

export interface DbNode {
  kind: "table" | "column" | "rpc" | "policy" | "index";
  key: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface DbIndex {
  documents: DbDoc[];
  nodes: DbNode[];
  edges: Array<{ fromKey: string; toKey: string; kind: string }>;
}

function isDenied(schema: string, name: string): boolean {
  const full = `${schema}.${name}`;
  return PII_DENYLIST.some((p) => full === p || full.startsWith(p) || name === p);
}

export async function indexDb(): Promise<DbIndex> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const documents: DbDoc[] = [];
  const nodes: DbNode[] = [];
  const edges: DbIndex["edges"] = [];

  // Tables & columns (public schema only — we intentionally never index auth/storage rows).
  const { data: cols, error: colErr } = await supabaseAdmin
    .schema("information_schema" as never)
    .from("columns" as never)
    .select("table_schema, table_name, column_name, data_type, is_nullable")
    .eq("table_schema", "public");
  if (colErr) throw colErr;

  const byTable = new Map<string, Array<{ name: string; type: string; nullable: boolean }>>();
  for (const row of (cols ?? []) as Array<{
    table_schema: string;
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>) {
    const key = `${row.table_schema}.${row.table_name}`;
    const list = byTable.get(key) ?? [];
    list.push({ name: row.column_name, type: row.data_type, nullable: row.is_nullable === "YES" });
    byTable.set(key, list);
  }

  for (const [tableKey, columns] of byTable) {
    const [schema, name] = tableKey.split(".");
    const denied = isDenied(schema, name);
    const tableNodeKey = `table:${tableKey}`;
    nodes.push({
      kind: "table",
      key: tableNodeKey,
      label: tableKey,
      metadata: { schema, name, columnCount: columns.length, denied },
    });
    for (const col of columns) {
      const colKey = `column:${tableKey}.${col.name}`;
      nodes.push({
        kind: "column",
        key: colKey,
        label: `${tableKey}.${col.name}`,
        metadata: { type: col.type, nullable: col.nullable },
      });
      edges.push({ fromKey: tableNodeKey, toKey: colKey, kind: "has_column" });
    }
    documents.push({
      path: `db://${tableKey}`,
      kind: "schema",
      // Structure hash only — never table contents.
      sha256Input: JSON.stringify({ table: tableKey, cols: columns }),
      summary: `Table ${tableKey} (${columns.length} columns)${denied ? " [PII — structure only]" : ""}`,
      metadata: { schema, name, columns, denied },
      denied,
    });
  }

  return { documents, nodes, edges };
}
