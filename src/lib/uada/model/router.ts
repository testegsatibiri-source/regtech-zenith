// H12.5 — ModelRouter: pure map from task → model + providerOptions.
// No gateway calls here; H13+ wires the router to createServerFn handlers.

export type UadaTask = "index" | "review" | "plan" | "audit" | "docs";

export interface ModelChoice {
  model: string;
  providerOptions?: Record<string, unknown>;
  reason: string;
}

const MAP: Record<UadaTask, ModelChoice> = {
  index:  { model: "google/gemini-3.1-flash-lite", reason: "high-volume, cost-efficient summarization" },
  review: { model: "google/gemini-3.6-flash",      reason: "balanced quality for diff review" },
  plan:   { model: "openai/gpt-5.5",               providerOptions: { lovable: { service_tier: "priority" } }, reason: "deep planning + reasoning" },
  audit:  { model: "google/gemini-3.6-flash",      reason: "structured compliance analysis" },
  docs:   { model: "google/gemini-3.1-flash-lite", reason: "documentation drafting" },
};

export const ModelRouter = {
  pick(task: UadaTask): ModelChoice {
    return MAP[task];
  },
  list(): Array<{ task: UadaTask } & ModelChoice> {
    return (Object.keys(MAP) as UadaTask[]).map((task) => ({ task, ...MAP[task] }));
  },
};
