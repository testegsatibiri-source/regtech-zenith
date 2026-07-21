// H8-BO — Packs Application Service.
// Wraps CountryRuntime with authorization, DB persistence (pack_installations),
// and audit. UI never calls the Runtime directly — always via this service.
import { CountryRuntime } from "@/sdk";
import type { InstalledPack, HealthReport } from "@/sdk";
import { CORE_VERSION } from "@/sdk";
import { SDK_VERSION } from "@/sdk/version";
import type { PlatformContext } from "./context";
import { permissionService } from "../permissionService";
import { auditService } from "./audit";

export interface PackSummaryDTO {
  country: string;
  name: string;
  currency: string;
  version: string;
  rulesetVersion: string;
  status: InstalledPack["status"];
  reason?: string;
  provides: string[];
  requires: string[];
  capabilities: string[];
  signature: { publisher: string; algo: string; checksum: string } | null;
  languages: string[];
  requiresCore: string;
}

export interface PackDetailDTO extends PackSummaryDTO {
  manifest: unknown;
  validation: InstalledPack["validation"] | null;
  installations: Array<{
    id: string;
    pack_version: string;
    status: string;
    installed_from: string;
    installed_core_version: string | null;
    installed_sdk_version: string | null;
    runtime_version: string | null;
    manifest_checksum: string | null;
    manifest_signature: string | null;
    installed_by: string | null;
    approved_at: string | null;
    released_at: string | null;
    deprecated_at: string | null;
    archived_at: string | null;
    created_at: string;
  }>;
}

function packToSummary(rec: InstalledPack): PackSummaryDTO {
  const m = rec.pack.manifest;
  const sig = m.signature ?? null;
  return {
    country: m.country,
    name: m.name,
    currency: m.currency,
    version: m.version,
    rulesetVersion: m.rulesetVersion,
    status: rec.status,
    reason: rec.reason,
    provides: [...(m.provides ?? m.capabilities ?? [])],
    requires: [...(m.requires ?? [])],
    capabilities: [...(m.capabilities ?? m.provides ?? [])],
    signature: sig ? { publisher: sig.publisher, algo: sig.algo, checksum: sig.checksum } : null,
    languages: [...(m.languages ?? [])],
    requiresCore: m.requiresCore,
  };
}

export const packsService = {
  async list(ctx: PlatformContext): Promise<PackSummaryDTO[]> {
    permissionService.ensure("pack.view", ctx.policy);
    return CountryRuntime.list().map(packToSummary);
  },

  async detail(ctx: PlatformContext, country: string): Promise<PackDetailDTO | null> {
    const scopedPolicy = { ...ctx.policy, targetCountry: country };
    permissionService.ensure("pack.view", scopedPolicy);
    const rec = CountryRuntime.record(country);
    if (!rec) return null;
    const { data: installations } = await ctx.supabase
      .from("pack_installations")
      .select("*")
      .eq("country_code", country)
      .order("created_at", { ascending: false })
      .limit(50);

    return {
      ...packToSummary(rec),
      manifest: rec.pack.manifest,
      validation: rec.validation ?? null,
      installations: (installations ?? []).map((r) => ({
        id: r.id,
        pack_version: r.pack_version,
        status: r.status,
        installed_from: r.installed_from,
        installed_core_version: r.installed_core_version,
        installed_sdk_version: r.installed_sdk_version,
        runtime_version: r.runtime_version,
        manifest_checksum: r.manifest_checksum,
        manifest_signature: r.manifest_signature,
        installed_by: r.installed_by,
        approved_at: r.approved_at,
        released_at: r.released_at,
        deprecated_at: r.deprecated_at,
        archived_at: r.archived_at,
        created_at: r.created_at,
      })),
    };
  },

  async health(ctx: PlatformContext, country: string): Promise<HealthReport> {
    const scopedPolicy = { ...ctx.policy, targetCountry: country };
    permissionService.ensure("pack.health", scopedPolicy);
    return CountryRuntime.health(country);
  },

  async recordInstallation(
    ctx: PlatformContext,
    input: {
      country: string;
      packVersion: string;
      installedFrom?: "manual" | "pipeline" | "rollback" | "marketplace";
      manifestChecksum?: string | null;
      manifestSignature?: string | null;
      notes?: string;
    },
  ) {
    const scopedPolicy = { ...ctx.policy, targetCountry: input.country };
    permissionService.ensure("pack.install", scopedPolicy);
    const { data, error } = await ctx.supabase
      .from("pack_installations")
      .insert({
        country_code: input.country,
        pack_version: input.packVersion,
        status: "draft",
        installed_from: input.installedFrom ?? "manual",
        installed_core_version: CORE_VERSION,
        installed_sdk_version: SDK_VERSION,
        runtime_version: CORE_VERSION,
        manifest_checksum: input.manifestChecksum ?? null,
        manifest_signature: input.manifestSignature ?? null,
        installed_by: ctx.policy.actorId,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await auditService.record(
      { ...ctx, policy: scopedPolicy },
      {
        action: "pack.install",
        target: data.id,
        component: "packs",
        newValue: { country: input.country, packVersion: input.packVersion },
      },
    );
    return data;
  },
};
