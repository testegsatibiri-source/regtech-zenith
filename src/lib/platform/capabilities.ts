// H10-IAM — Capability-first authorization. Local mirror of the seed inserted
// in migration `role_capabilities`. Kept in sync so client-side UI can render
// with zero DB round-trips. The server-side ground truth lives in the DB.
import type { PlatformRole } from "./policy/types";

export type Capability =
  | "dashboard.view"
  | "pack.view"
  | "pack.install"
  | "pack.uninstall"
  | "pack.rollback"
  | "pack.health"
  | "pack.sign"
  | "pack.countersign"
  | "release.view"
  | "release.transition"
  | "release.approve"
  | "release.publish"
  | "release.rollback"
  | "parameters.view"
  | "parameters.import"
  | "parameters.export"
  | "parameters.edit"
  | "flags.view"
  | "flags.edit"
  | "audit.view"
  | "iam.manage"
  | "observability.view"
  | "incidents.manage";

export type CapabilityScope = "global" | "country";

export interface CapabilityGrant {
  capability: Capability;
  scope: CapabilityScope;
}

export const DEFAULT_ROLE_CAPABILITIES: Record<PlatformRole, CapabilityGrant[]> = {
  platform_admin: [
    "dashboard.view",
    "pack.view",
    "pack.install",
    "pack.uninstall",
    "pack.rollback",
    "pack.health",
    "pack.sign",
    "pack.countersign",
    "release.view",
    "release.transition",
    "release.approve",
    "release.publish",
    "release.rollback",
    "parameters.view",
    "parameters.import",
    "parameters.export",
    "flags.view",
    "flags.edit",
    "audit.view",
    "iam.manage",
    "observability.view",
    "incidents.manage",
  ].map((c) => ({ capability: c as Capability, scope: "global" as const })),
  platform_operator: [
    "dashboard.view",
    "pack.view",
    "pack.health",
    "release.view",
    "parameters.view",
    "parameters.export",
    "flags.view",
    "observability.view",
    "incidents.manage",
  ].map((c) => ({ capability: c as Capability, scope: "global" as const })),
  platform_auditor: [
    "dashboard.view",
    "pack.view",
    "release.view",
    "parameters.view",
    "flags.view",
    "audit.view",
    "observability.view",
  ].map((c) => ({ capability: c as Capability, scope: "global" as const })),
  country_cto: [
    "dashboard.view",
    "pack.view",
    "pack.install",
    "pack.rollback",
    "pack.sign",
    "release.view",
    "release.transition",
    "release.approve",
    "parameters.view",
    "parameters.import",
    "flags.view",
    "flags.edit",
  ].map((c) => ({ capability: c as Capability, scope: "country" as const })),
};

export interface CapabilityContext {
  roles: PlatformRole[];
  countryScopes: string[];
  targetCountry?: string;
}

export function hasCapability(cap: Capability, ctx: CapabilityContext): boolean {
  for (const role of ctx.roles) {
    const grants = DEFAULT_ROLE_CAPABILITIES[role] ?? [];
    for (const g of grants) {
      if (g.capability !== cap) continue;
      if (g.scope === "global") return true;
      if (
        g.scope === "country" &&
        ctx.targetCountry &&
        ctx.countryScopes.includes(ctx.targetCountry)
      ) {
        return true;
      }
    }
  }
  return false;
}
