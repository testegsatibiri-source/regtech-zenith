// H8-BO — Policy / Decision types. Centralizes authorization decisions so
// the UI, HTTP layer, and Application Services never write ad-hoc role checks.

export type PlatformRole =
  | "platform_admin"
  | "country_cto"
  | "platform_operator"
  | "platform_auditor";

export type PlatformAction =
  // Packs
  | "pack.view"
  | "pack.install"
  | "pack.uninstall"
  | "pack.rollback"
  | "pack.health"
  // Releases
  | "release.view"
  | "release.transition"
  | "release.approve"
  | "release.publish"
  | "release.rollback"
  // Parameters
  | "parameters.view"
  | "parameters.import"
  | "parameters.export"
  | "parameters.edit"
  // Calendar / Translations / Rules
  | "calendar.view"
  | "calendar.edit"
  | "translations.view"
  | "translations.edit"
  | "rules.view"
  // Flags
  | "flags.view"
  | "flags.edit"
  // Audit
  | "audit.view"
  // Dashboard
  | "dashboard.view";

export interface PolicyContext {
  actorId: string;
  roles: PlatformRole[];
  /** Country codes this actor administers as country_cto (from country_cto_scopes). */
  countryScopes: string[];
  /** Country the action targets, when applicable. */
  targetCountry?: string;
  /** Environment tag, if relevant (used by future policies). */
  environment?: "preview" | "production";
  /** Request-level correlation for audit. */
  correlationId: string;
  requestId?: string;
}

export interface Decision {
  allow: boolean;
  reason: string;
}

export interface Policy {
  action: PlatformAction;
  decide: (ctx: PolicyContext) => Decision;
}
