// H14 — Planner (thin wrapper over InferenceService).
import type { UadaResponse } from "@/lib/uada/contracts/response";
import type { Plan } from "@/lib/uada/contracts/plan";
import { ContextAssembler } from "@/lib/uada/context/ContextAssembler.server";
import { InferenceService } from "@/lib/uada/inference/InferenceService.server";

export interface PlanOptions {
  objective: string;
  snapshotVersion?: number;
  maxDocuments?: number;
  expansionDepth?: number;
}

export const PlannerEngine = {
  async plan(opts: PlanOptions): Promise<UadaResponse<Plan>> {
    const bundle = await ContextAssembler.assemble({
      objective: opts.objective,
      snapshotVersion: opts.snapshotVersion,
      maxDocuments: opts.maxDocuments ?? 12,
      maxTokens: 12000,
      expansionDepth: opts.expansionDepth ?? 1,
      includeDocs: true,
      includeGraph: true,
      includeMemory: true,
      minimumScore: 0.3,
    });
    return InferenceService.plan(bundle, opts.objective);
  },
};
