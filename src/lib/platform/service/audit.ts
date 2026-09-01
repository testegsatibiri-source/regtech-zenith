// H8-BO — Audit service. All Platform mutations flow through `record()`.
import type { PlatformContext } from "./context";
import type { PlatformAction } from "../policy/types";
import { permissionService } from "../permissionService";

export interface AuditEntry {
  action: PlatformAction | string;
  target?: string;
  component?: string;
  oldValue?: unknown;
  newValue?: unknown;
  payload?: Record<string, unknown>;
}

export const auditService = {
  async record(ctx: PlatformContext, entry: AuditEntry): Promise<void> {
    await ctx.supabase.from("platform_audit_log").insert({
      actor: ctx.policy.actorId,
      action: entry.action,
      target: entry.target ?? null,
      country_code: ctx.policy.targetCountry ?? null,
      component: entry.component ?? null,
      old_value: (entry.oldValue as never) ?? null,
      new_value: (entry.newValue as never) ?? null,
      correlation_id: ctx.policy.correlationId,
      request_id: ctx.policy.requestId ?? null,
      payload: (entry.payload as never) ?? {},
    });
  },

  async list(
    ctx: PlatformContext,
    filters: { country?: string; limit?: number; component?: string } = {},
  ) {
    permissionService.ensure("audit.view", ctx.policy);
    let q = ctx.supabase
      .from("platform_audit_log")
      .select(
        "id, actor, action, target, country_code, component, old_value, new_value, correlation_id, request_id, at",
      )
      .order("at", { ascending: false })
      .limit(filters.limit ?? 50);
    if (filters.country) q = q.eq("country_code", filters.country);
    if (filters.component) q = q.eq("component", filters.component);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
