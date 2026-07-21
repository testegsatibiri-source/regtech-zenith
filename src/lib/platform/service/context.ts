// H8-BO — Platform request context builder. Reads roles + country scopes
// once per request and hands them to the service layer as a plain PolicyContext.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PolicyContext, PlatformRole } from "../policy/types";

type SB = SupabaseClient<Database>;

const PLATFORM_ROLES: readonly PlatformRole[] = [
  "platform_admin",
  "country_cto",
  "platform_operator",
  "platform_auditor",
];

function makeCorrelationId(): string {
  // Cheap correlation id — good enough for audit, no crypto.subtle needed.
  return "corr_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

export interface PlatformContext {
  supabase: SB;
  policy: PolicyContext;
}

export async function buildPlatformContext(
  supabase: SB,
  userId: string,
  opts: { targetCountry?: string; environment?: "preview" | "production"; requestId?: string } = {},
): Promise<PlatformContext> {
  const [{ data: rolesRows }, { data: scopeRows }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("country_cto_scopes").select("country_code").eq("user_id", userId),
  ]);

  const roles = (rolesRows ?? [])
    .map((r) => r.role as PlatformRole)
    .filter((r): r is PlatformRole => PLATFORM_ROLES.includes(r));
  const countryScopes = (scopeRows ?? []).map((r) => r.country_code);

  return {
    supabase,
    policy: {
      actorId: userId,
      roles,
      countryScopes,
      targetCountry: opts.targetCountry,
      environment: opts.environment,
      correlationId: makeCorrelationId(),
      requestId: opts.requestId,
    },
  };
}
