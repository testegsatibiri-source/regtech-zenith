// H14 — Server functions for Search / Impact / Plan / Benchmark. Thin wrappers.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED = new Set(["platform_admin", "platform_operator", "country_cto"]);

async function assertRole(supabase: unknown, userId: string) {
  const c = supabase as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => Promise<{ data: Array<{ role: string }> | null }> } } };
  const { data } = await c.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => ALLOWED.has(r.role))) throw new Error("Forbidden");
}

const SearchInput = z.object({
  query: z.string().min(1),
  snapshotVersion: z.number().int().positive().optional(),
  k: z.number().int().min(1).max(50).default(10),
  minimumScore: z.number().min(0).max(1).default(0.1),
  expansionDepth: z.number().int().min(0).max(3).default(0),
  reranker: z.enum(["none", "graph-proximity"]).default("none"),
});

export const uadaSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SearchInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId);
    const { SearchEngine } = await import("@/lib/uada/engines/search.server");
    return (await SearchEngine.search(data)) as unknown as { data: unknown };
  });

const ImpactInput = z.object({
  nodeId: z.string().uuid(),
  depth: z.number().int().min(1).max(4).default(2),
  snapshotVersion: z.number().int().positive().optional(),
});

export const uadaImpactOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ImpactInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId);
    const { ImpactEngine } = await import("@/lib/uada/engines/impact.server");
    return (await ImpactEngine.impactOf(data)) as unknown as { data: unknown };
  });

const PlanInput = z.object({
  objective: z.string().min(4),
  snapshotVersion: z.number().int().positive().optional(),
  maxDocuments: z.number().int().min(1).max(30).default(12),
  expansionDepth: z.number().int().min(0).max(2).default(1),
});

export const uadaPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PlanInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId);
    const { PlannerEngine } = await import("@/lib/uada/engines/plan.server");
    return (await PlannerEngine.plan(data)) as unknown as { data: unknown };
  });

const BenchmarkInput = z.object({
  snapshotVersion: z.number().int().positive().optional(),
});

export const uadaRunBenchmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BenchmarkInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId);
    const { runBenchmark } = await import("@/lib/uada/benchmark/runner.server");
    return runBenchmark(data);
  });
