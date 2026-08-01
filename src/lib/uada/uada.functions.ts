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
    return JSON.parse(JSON.stringify(await SearchEngine.search(data)));
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
    return JSON.parse(JSON.stringify(await ImpactEngine.impactOf(data)));
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
    return JSON.parse(JSON.stringify(await PlannerEngine.plan(data)));
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

// H15 — Architecture review of a unified diff.
const ReviewInput = z.object({
  diff: z.string().min(1).max(400_000),
  snapshotVersion: z.number().int().positive().optional(),
  advisory: z.boolean().default(true),
  maxDocuments: z.number().int().min(1).max(30).default(10),
});

export const uadaReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReviewInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId);
    const { ReviewEngine } = await import("@/lib/uada/engines/review.server");
    return JSON.parse(JSON.stringify(await ReviewEngine.review(data)));
  });

// H16 — Architecture Score for a snapshot (deterministic, persisted).
const ScoreInput = z.object({
  snapshotVersion: z.number().int().positive().optional(),
  persist: z.boolean().default(true),
});

export const uadaScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScoreInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId);
    const { ScoreEngine } = await import("@/lib/uada/engines/score.server");
    return JSON.parse(JSON.stringify(await ScoreEngine.score(data)));
  });

// H16 — Tool bindings inventory (capability -> implementation).
export const uadaTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId);
    const { bindTools } = await import("@/lib/uada/tools/bindings.server");
    const { ToolRegistry } = await import("@/lib/uada/tools/ToolRegistry");
    await bindTools();
    return ToolRegistry.list().map((b) => ({
      capabilityId: b.capabilityId,
      implementation: b.implementation,
    }));
  });
