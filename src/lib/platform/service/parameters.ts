// H8-BO — Parameters Application Service.
// **Read-only over the Runtime** in this sprint (Runtime is source of truth).
// UI can view runtime-provided params, diff versions in the register,
// import a draft, and export JSON. No row becomes `active` via this service.
import type { PlatformContext } from "./context";
import { permissionService } from "../permissionService";
import { auditService } from "./audit";
import { CountryRuntime } from "@/sdk";
import { sha256Hex } from "@/lib/hashing";

export interface RuntimeParametersDTO {
  country: string;
  rulesetVersion: string;
  packVersion: string;
  /** JSON-safe serialization of the runtime params snapshot. */
  params: string;
  source: "country-pack";
}

export const parametersService = {
  /** Runtime-provided params — the Source of Truth banner comes from here. */
  runtime(ctx: PlatformContext, country: string): RuntimeParametersDTO {
    const scopedPolicy = { ...ctx.policy, targetCountry: country };
    permissionService.ensure("parameters.view", scopedPolicy);
    const pack = CountryRuntime.get(country);
    return {
      country,
      rulesetVersion: pack.manifest.rulesetVersion,
      packVersion: pack.manifest.version,
      params: JSON.stringify(pack.params ?? {}),
      source: "country-pack",
    };
  },

  /** All rows in the register for a country, newest first. */
  async listRegister(ctx: PlatformContext, country: string) {
    const scopedPolicy = { ...ctx.policy, targetCountry: country };
    permissionService.ensure("parameters.view", scopedPolicy);
    const { data, error } = await ctx.supabase
      .from("regulatory_parameters")
      .select("*")
      .eq("country_code", country)
      .order("parameter_key", { ascending: true })
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Diff two versions of the same parameter_key (payload only). */
  async diff(
    ctx: PlatformContext,
    country: string,
    parameterKey: string,
    versionA: number,
    versionB: number,
  ) {
    const scopedPolicy = { ...ctx.policy, targetCountry: country };
    permissionService.ensure("parameters.view", scopedPolicy);
    const { data, error } = await ctx.supabase
      .from("regulatory_parameters")
      .select("version, payload, status, checksum")
      .eq("country_code", country)
      .eq("parameter_key", parameterKey)
      .in("version", [versionA, versionB]);
    if (error) throw new Error(error.message);
    const a = data?.find((r) => r.version === versionA) ?? null;
    const b = data?.find((r) => r.version === versionB) ?? null;
    return { a, b };
  },

  /** Import a JSON snapshot as a new `draft` row. Never activates. */
  async importSnapshot(
    ctx: PlatformContext,
    input: { country: string; parameterKey: string; payload: unknown; notes?: string },
  ) {
    const scopedPolicy = { ...ctx.policy, targetCountry: input.country };
    permissionService.ensure("parameters.import", scopedPolicy);

    const { data: existing } = await ctx.supabase
      .from("regulatory_parameters")
      .select("version")
      .eq("country_code", input.country)
      .eq("parameter_key", input.parameterKey)
      .order("version", { ascending: false })
      .limit(1);
    const nextVersion = (existing?.[0]?.version ?? 0) + 1;
    const checksum = await sha256Hex(JSON.stringify(input.payload));

    const { data, error } = await ctx.supabase
      .from("regulatory_parameters")
      .insert({
        country_code: input.country,
        parameter_key: input.parameterKey,
        payload: input.payload as never,
        version: nextVersion,
        status: "draft",
        author: ctx.policy.actorId,
        checksum,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await auditService.record(
      { ...ctx, policy: scopedPolicy },
      {
        action: "parameters.import",
        target: data.id,
        component: "parameters",
        newValue: { parameterKey: input.parameterKey, version: nextVersion, checksum },
      },
    );

    return data;
  },

  /** Export the runtime snapshot for offline review. */
  export(ctx: PlatformContext, country: string): RuntimeParametersDTO {
    const scopedPolicy = { ...ctx.policy, targetCountry: country };
    permissionService.ensure("parameters.export", scopedPolicy);
    return this.runtime({ ...ctx, policy: scopedPolicy }, country);
  },
};
