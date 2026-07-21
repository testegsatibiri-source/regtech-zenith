// H8-BO — Feature-flag service (per-country, environment-aware).
import type { PlatformContext } from "./context";
import { permissionService } from "../permissionService";
import { auditService } from "./audit";

export const flagsService = {
  async list(ctx: PlatformContext, country?: string) {
    permissionService.ensure("flags.view", ctx.policy);
    let q = ctx.supabase.from("pack_feature_flags").select("*").order("country_code");
    if (country) q = q.eq("country_code", country);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async upsert(
    ctx: PlatformContext,
    input: {
      country: string;
      flag: string;
      enabled: boolean;
      rollout_percentage?: number;
      environment?: "preview" | "production" | "all";
      effective_from?: string | null;
      effective_to?: string | null;
    },
  ) {
    const scopedPolicy = { ...ctx.policy, targetCountry: input.country };
    permissionService.ensure("flags.edit", scopedPolicy);

    const { data, error } = await ctx.supabase
      .from("pack_feature_flags")
      .upsert(
        {
          country_code: input.country,
          flag: input.flag,
          enabled: input.enabled,
          rollout_percentage: input.rollout_percentage ?? 100,
          environment: input.environment ?? "all",
          effective_from: input.effective_from ?? null,
          effective_to: input.effective_to ?? null,
          updated_by: ctx.policy.actorId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "country_code,flag,environment" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);

    await auditService.record(
      { ...ctx, policy: scopedPolicy },
      {
        action: "flags.edit",
        target: data.id,
        component: "flags",
        newValue: { flag: input.flag, enabled: input.enabled, environment: data.environment },
      },
    );

    return data;
  },
};
