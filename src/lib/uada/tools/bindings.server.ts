// H16 — Tool bindings. Registers every engine in the ToolRegistry so the
// Orchestrator (H17+) can resolve capabilities uniformly instead of importing
// engines one by one. Server-only: engines are server modules.
import { ToolRegistry } from "@/lib/uada/tools/ToolRegistry";
import type { CapabilityId } from "@/lib/uada/capabilities/CapabilityRegistry";

let bound = false;

/** Idempotent. Safe to call on every server-function invocation. */
export async function bindTools(): Promise<void> {
  if (bound) return;
  bound = true;

  const [{ SearchEngine }, { ImpactEngine }, { PlannerEngine }, { ReviewEngine }, { ScoreEngine }] =
    await Promise.all([
      import("@/lib/uada/engines/search.server"),
      import("@/lib/uada/engines/impact.server"),
      import("@/lib/uada/engines/plan.server"),
      import("@/lib/uada/engines/review.server"),
      import("@/lib/uada/engines/score.server"),
    ]);

  ToolRegistry.bind("search", {
    implementation: "SearchEngine",
    handler: (input) => SearchEngine.search(input as Parameters<typeof SearchEngine.search>[0]),
  });
  ToolRegistry.bind("impact", {
    implementation: "ImpactEngine",
    handler: (input) => ImpactEngine.impactOf(input as Parameters<typeof ImpactEngine.impactOf>[0]),
  });
  ToolRegistry.bind("plan", {
    implementation: "PlannerEngine",
    handler: (input) => PlannerEngine.plan(input as Parameters<typeof PlannerEngine.plan>[0]),
  });
  ToolRegistry.bind("review", {
    implementation: "ReviewEngine",
    handler: (input) => ReviewEngine.review(input as Parameters<typeof ReviewEngine.review>[0]),
  });
  ToolRegistry.bind("score", {
    implementation: "ScoreEngine",
    handler: (input) => ScoreEngine.score(input as Parameters<typeof ScoreEngine.score>[0]),
  });
}

/** Capabilities that MUST have a binding once bindTools() ran. */
export const BOUND_CAPABILITIES: readonly CapabilityId[] = [
  "search",
  "impact",
  "plan",
  "review",
  "score",
] as const;
