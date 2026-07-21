// H8-BO — Releases Application Service. Owns the pack_installations
// lifecycle: draft → candidate → approved → released → deprecated → archived
// (+ rolled_back as a special terminal transition from released).
import type { PlatformContext } from "./context";
import type { PlatformAction } from "../policy/types";
import { permissionService } from "../permissionService";
import { auditService } from "./audit";
import { CountryRuntime } from "@/sdk";

export type ReleaseStatus =
  | "draft"
  | "candidate"
  | "approved"
  | "released"
  | "deprecated"
  | "archived"
  | "rolled_back";

const ALLOWED_TRANSITIONS: Record<ReleaseStatus, ReleaseStatus[]> = {
  draft: ["candidate", "archived"],
  candidate: ["approved", "archived"],
  approved: ["released", "archived"],
  released: ["deprecated", "rolled_back"],
  deprecated: ["archived"],
  archived: [],
  rolled_back: ["archived"],
};

export function canTransition(from: ReleaseStatus, to: ReleaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

function actionFor(to: ReleaseStatus): PlatformAction {
  switch (to) {
    case "approved": return "release.approve";
    case "released": return "release.publish";
    case "rolled_back": return "release.rollback";
    default: return "release.transition";
  }
}

async function evaluateGates(country: string): Promise<{ ok: boolean; details: string[] }> {
  const details: string[] = [];
  const rec = CountryRuntime.record(country);
  if (!rec) return { ok: false, details: ["pack not installed"] };
  // Validator gate
  if (rec.validation && rec.validation.errors.length > 0) {
    details.push(`validator errors: ${rec.validation.errors.length}`);
  }
  // Health gate
  try {
    const health = await CountryRuntime.health(country);
    if (health.status === "error") details.push(`health: error`);
  } catch (e) {
    details.push(`health check threw: ${(e as Error).message}`);
  }
  return { ok: details.length === 0, details };
}

export const releasesService = {
  async list(ctx: PlatformContext, filters: { country?: string; limit?: number } = {}) {
    permissionService.ensure("release.view", ctx.policy);
    let q = ctx.supabase
      .from("pack_installations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 100);
    if (filters.country) q = q.eq("country_code", filters.country);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async transition(
    ctx: PlatformContext,
    input: { id: string; to: ReleaseStatus; notes?: string },
  ) {
    const { data: current, error: readError } = await ctx.supabase
      .from("pack_installations")
      .select("*")
      .eq("id", input.id)
      .single();
    if (readError || !current) throw new Error(readError?.message ?? "release not found");

    const scopedPolicy = { ...ctx.policy, targetCountry: current.country_code };
    const action = actionFor(input.to);
    permissionService.ensure(action, scopedPolicy);

    const from = current.status as ReleaseStatus;
    if (!canTransition(from, input.to)) {
      throw new Error(`Invalid transition: ${from} → ${input.to}`);
    }

    // Release gate: approved → released must pass validator + health.
    if (from === "approved" && input.to === "released") {
      const gates = await evaluateGates(current.country_code);
      if (!gates.ok) {
        throw new Error(`Release gates failed: ${gates.details.join("; ")}`);
      }
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: input.to };
    if (input.to === "approved") { patch.approved_by = ctx.policy.actorId; patch.approved_at = now; }
    if (input.to === "released") { patch.released_by = ctx.policy.actorId; patch.released_at = now; }
    if (input.to === "deprecated") { patch.deprecated_by = ctx.policy.actorId; patch.deprecated_at = now; }
    if (input.to === "archived") { patch.archived_by = ctx.policy.actorId; patch.archived_at = now; }
    if (input.notes) patch.notes = input.notes;

    const { data: updated, error: updateError } = await ctx.supabase
      .from("pack_installations")
      .update(patch)
      .eq("id", input.id)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);

    await auditService.record(
      { ...ctx, policy: scopedPolicy },
      {
        action,
        target: input.id,
        component: "releases",
        oldValue: { status: from },
        newValue: { status: input.to },
        payload: input.notes ? { notes: input.notes } : {},
      },
    );

    return updated;
  },
};
