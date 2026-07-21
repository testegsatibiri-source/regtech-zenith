// H10-Obs — PostgresSink. Hot tier: writes to public.metrics_events (last 30
// days). Uses supabaseAdmin so it can be called from server contexts without
// being blocked by RLS. Callers are already server-side.
import type { MetricEvent, MetricSink } from "../sink";

export class PostgresSink implements MetricSink {
  name = "postgres";
  async ingest(events: MetricEvent[]): Promise<void> {
    if (events.length === 0) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = events.map((e) => ({
      name: e.name,
      layer: e.layer,
      value_ms: Math.round(e.value),
      ts: e.ts ?? new Date().toISOString(),
      tags: (e.tags ?? {}) as never,
    }));
    const { error } = await supabaseAdmin.from("metrics_events").insert(rows);
    if (error) throw error;
  }
}
