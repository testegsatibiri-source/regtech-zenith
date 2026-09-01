// H8-BO — Policy catalogue. One Policy per PlatformAction. Kept intentionally
// declarative so future dimensions (company, region, product, environment)
// can be added without touching call sites.
import type { Policy, PolicyContext, Decision, PlatformAction } from "./types";

const ALLOW = (reason: string): Decision => ({ allow: true, reason });
const DENY = (reason: string): Decision => ({ allow: false, reason });

const hasRole = (ctx: PolicyContext, ...roles: PolicyContext["roles"]) =>
  roles.some((r) => ctx.roles.includes(r));

const ownsCountry = (ctx: PolicyContext) =>
  ctx.targetCountry ? ctx.countryScopes.includes(ctx.targetCountry) : false;

function adminOr(check: (ctx: PolicyContext) => boolean, label: string) {
  return (ctx: PolicyContext): Decision => {
    if (hasRole(ctx, "platform_admin")) return ALLOW("platform_admin");
    if (check(ctx)) return ALLOW(label);
    return DENY(`requires platform_admin or ${label}`);
  };
}

const anyPlatformStaff = (ctx: PolicyContext): Decision =>
  hasRole(ctx, "platform_admin", "platform_operator", "platform_auditor")
    ? ALLOW("platform staff")
    : hasRole(ctx, "country_cto") && ownsCountry(ctx)
      ? ALLOW("country_cto scoped")
      : DENY("no platform role");

const adminOnly =
  (label: string) =>
  (ctx: PolicyContext): Decision =>
    hasRole(ctx, "platform_admin") ? ALLOW("platform_admin") : DENY(label);

const adminOrCountryCto = adminOr(
  (ctx) => hasRole(ctx, "country_cto") && ownsCountry(ctx),
  "country_cto scoped",
);

const adminOrOperator = adminOr((ctx) => hasRole(ctx, "platform_operator"), "platform_operator");

export const POLICIES: Record<PlatformAction, Policy> = {
  "dashboard.view": { action: "dashboard.view", decide: anyPlatformStaff },
  "pack.view": { action: "pack.view", decide: anyPlatformStaff },
  "pack.install": { action: "pack.install", decide: adminOrCountryCto },
  "pack.uninstall": {
    action: "pack.uninstall",
    decide: adminOnly("only platform_admin can uninstall packs"),
  },
  "pack.rollback": { action: "pack.rollback", decide: adminOrCountryCto },
  "pack.health": { action: "pack.health", decide: adminOrOperator },
  "release.view": { action: "release.view", decide: anyPlatformStaff },
  "release.transition": { action: "release.transition", decide: adminOrCountryCto },
  "release.approve": { action: "release.approve", decide: adminOrCountryCto },
  "release.publish": {
    action: "release.publish",
    decide: adminOnly("only platform_admin can publish releases"),
  },
  "release.rollback": {
    action: "release.rollback",
    decide: adminOnly("only platform_admin can roll back releases"),
  },
  "parameters.view": { action: "parameters.view", decide: anyPlatformStaff },
  "parameters.import": { action: "parameters.import", decide: adminOrCountryCto },
  "parameters.export": { action: "parameters.export", decide: anyPlatformStaff },
  // Editing is disabled while Runtime is the source of truth (DEBT-022).
  "parameters.edit": {
    action: "parameters.edit",
    decide: () => DENY("parameters editing disabled until DEBT-022 lands"),
  },
  "calendar.view": { action: "calendar.view", decide: anyPlatformStaff },
  "calendar.edit": { action: "calendar.edit", decide: adminOrCountryCto },
  "translations.view": { action: "translations.view", decide: anyPlatformStaff },
  "translations.edit": { action: "translations.edit", decide: adminOrCountryCto },
  "rules.view": { action: "rules.view", decide: anyPlatformStaff },
  "flags.view": { action: "flags.view", decide: anyPlatformStaff },
  "flags.edit": { action: "flags.edit", decide: adminOrCountryCto },
  "audit.view": {
    action: "audit.view",
    decide: (ctx) =>
      hasRole(ctx, "platform_admin", "platform_auditor")
        ? ALLOW("admin or auditor")
        : DENY("only platform_admin or platform_auditor can view audit"),
  },
};
