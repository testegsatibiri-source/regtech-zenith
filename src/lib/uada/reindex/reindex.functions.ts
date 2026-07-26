// H13 — reindex() server function. Gated by uada.enabled + platform role.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ReindexInputSchema = z.object({
  mode: z.enum(["full", "incremental"]),
  reason: z.enum(["manual", "model_change", "schema_change", "corruption"]).default("manual"),
});

export const reindex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReindexInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // AuthZ: only platform_admin or platform_operator can trigger.
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const allowed = new Set(["platform_admin", "platform_operator"]);
    if (!(roles ?? []).some((r) => allowed.has(r.role))) {
      throw new Error("Forbidden: platform_admin or platform_operator required");
    }

    // Feature gate check
    const env = (process.env.LOVABLE_ENV as string) ?? "preview";
    const { data: gate } = await supabase
      .from("platform_feature_gates")
      .select("enabled")
      .eq("gate", "uada.enabled")
      .eq("environment", env)
      .maybeSingle();
    if (!gate?.enabled) {
      throw new Error("uada.enabled feature gate is off");
    }

    const { runReindex } = await import("@/lib/uada/reindex/orchestrator.server");
    return await runReindex(data);
  });

export const listRecentRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("uada_index_runs")
      .select("id, snapshot_id, mode, reason, started_at, finished_at, duration_ms, docs_upserted, docs_denied, graph_nodes, graph_edges, embedding_batches, embedding_tokens, coverage, ok, error")
      .order("started_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getActiveSnapshotSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: active } = await supabase
      .from("uada_snapshots")
      .select("id, version, state, promotion_state, embedding_model, embedding_dimensions, stats, activated_at, created_at")
      .eq("state", "active")
      .maybeSingle();
    const env = (process.env.LOVABLE_ENV as string) ?? "preview";
    const { data: gate } = await supabase
      .from("platform_feature_gates")
      .select("enabled")
      .eq("gate", "uada.enabled")
      .eq("environment", env)
      .maybeSingle();
    return { active: active ?? null, gateEnabled: gate?.enabled ?? false, env };
  });
