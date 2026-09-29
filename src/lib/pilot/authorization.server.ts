// Pilot authorization — server-only identity + lookup layer.
//
// `pilot_requests` is deny-all under RLS, so the lookup runs with the service
// role. This file is server-only by filename convention and must only ever be
// reached through `await import(...)` inside a server-function handler.

import {
  evaluatePilotAuthorization,
  type PilotAuthorizationDecision,
  type PilotAuthorizationRecord,
} from "./authorization";

/** The denial half of the decision union, narrowed for callers. */
type PilotDenial = Extract<PilotAuthorizationDecision, { allowed: false }>;

/** Platform roles that may operate the Backoffice. */
export const PLATFORM_ROLES = [
  "platform_admin",
  "platform_operator",
  "platform_auditor",
  "country_cto",
] as const;

/** Roles that may change the state of a pilot request. */
export const PILOT_DECISION_ROLES = ["platform_admin", "platform_operator"] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/**
 * Resolve the authenticated user's e-mail from the verified token claims,
 * falling back to the Auth admin API. Never accepts an e-mail from the client.
 */
export async function resolveSessionEmail(
  userId: string,
  claims: Record<string, unknown> | undefined,
): Promise<string | null> {
  const claimed = typeof claims?.["email"] === "string" ? (claims["email"] as string) : null;
  if (claimed) return claimed.trim().toLowerCase();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email.trim().toLowerCase();
}

/** Fetch the most relevant pilot request for an e-mail (latest decision wins). */
export async function findPilotRequestByEmail(
  email: string,
): Promise<PilotAuthorizationRecord | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("pilot_requests")
    .select("id, status, authorized_country, pilot_expires_at")
    .eq("email", email.trim().toLowerCase())
    .order("approved_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PilotAuthorizationRecord | null) ?? null;
}

/** Does this user hold any of the given platform roles? */
export async function userHasAnyRole(
  userId: string,
  roles: readonly string[],
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).some((r) => roles.includes(r.role as string));
}

/**
 * The single authorization boundary for customer workspace creation.
 * Platform staff are authorized as staff — that is a platform authorization,
 * not a pilot entitlement, and it is recorded as such.
 */
export async function authorizePilotCountry(args: {
  userId: string;
  claims: Record<string, unknown> | undefined;
  country: string;
  now?: Date;
}): Promise<
  | { allowed: true; via: "platform_role"; requestId: null; email: string | null }
  | { allowed: true; via: "pilot"; requestId: string; email: string }
  | { allowed: false; decision: PilotDenial; email: string | null }
> {
  const email = await resolveSessionEmail(args.userId, args.claims);

  if (await userHasAnyRole(args.userId, PLATFORM_ROLES)) {
    return { allowed: true, via: "platform_role", requestId: null, email };
  }

  if (!email) {
    return {
      allowed: false,
      decision: { allowed: false, reason: "no_request", requestId: null },
      email: null,
    };
  }

  const record = await findPilotRequestByEmail(email);
  const decision = evaluatePilotAuthorization(record, args.country, args.now ?? new Date());

  if (!decision.allowed) return { allowed: false, decision, email };
  return { allowed: true, via: "pilot", requestId: decision.requestId, email };
}

/** Append-only trail entry for every authorization decision that matters. */
export async function logPilotAudit(entry: {
  actor: string | null;
  action: string;
  target: string | null;
  country: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("platform_audit_log").insert({
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    country_code: entry.country,
    component: "pilot.authorization",
    old_value: (entry.oldValue ?? null) as never,
    new_value: (entry.newValue ?? null) as never,
    payload: (entry.payload ?? {}) as never,
  });
}

/**
 * Mark an approved request as converted exactly once. Re-running it for an
 * already converted request is a no-op, so a user creating a second company
 * never rewrites the original conversion evidence.
 */
export async function markPilotRequestConverted(
  requestId: string,
  companyId: string,
  actorId: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("pilot_requests")
    .update({
      status: "converted",
      converted_company_id: companyId,
      converted_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return; // already converted — idempotent

  await logPilotAudit({
    actor: actorId,
    action: "pilot_request.converted",
    target: requestId,
    country: null,
    oldValue: { status: "approved" },
    newValue: { status: "converted", converted_company_id: companyId },
  });
}
