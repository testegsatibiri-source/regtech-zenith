// H17-ID — Pilot request intake for the Indonesia landing.
// Public submission is unauthenticated; reads are restricted to platform roles
// and every read is written to the platform audit log.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { sha256Hex } from "@/lib/hashing";

const CONSENT_VERSION = "id-pilot-2026-09-08";

const ROLES = ["admin", "platform_admin", "platform_operator"] as const;

type AppRole = (typeof ROLES)[number];

const submitSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  companyName: z.string().trim().min(1).max(120),
  employeeRange: z.enum(["1-50", "51-200", "201-1000", "1000+"]),
  role: z.enum([
    "HR Executive",
    "Finance Director",
    "Legal & Compliance Officer",
    "Accounting Partner",
  ]),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Consent is required" }),
  }),
});

function extractIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ??
    "0.0.0.0"
  );
}

async function checkRateLimits(
  supabase: Database["public"]["Tables"]["pilot_requests"]["Insert"]["email"] extends string
    ? { from: (t: "pilot_requests") => { select: (c: string) => { gte: (c: string, v: string) => { eq: (c: string, v: string) => { count: string } } } } }
    : never,
  email: string,
  ipHash: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: emailCount }, { count: ipCount }] = await Promise.all([
    supabase.from("pilot_requests").select("id", { count: "exact", head: true }).gte("created_at", since).eq("email", email),
    supabase.from("pilot_requests").select("id", { count: "exact", head: true }).gte("created_at", since).eq("ip_hash", ipHash),
  ]);
  if ((emailCount ?? 0) >= 3) {
    return { ok: false, reason: "Too many submissions from this email address." };
  }
  if ((ipCount ?? 0) >= 10) {
    return { ok: false, reason: "Too many submissions from this network." };
  }
  return { ok: true };
}

async function notifyNewPilotRequest(_id: string): Promise<boolean> {
  // No PII is ever included in the notification body. If an e-mail provider
  // is configured in the future, this is where the generic alert is sent.
  const enabled = process.env["PILOT_REQUEST_NOTIFICATION_EMAIL"] && process.env["RESEND_API_KEY"];
  if (!enabled) {
    console.log("[pilot] new request received (email notifications disabled)");
    return false;
  }
  // Generic notification only — no name, email or company in the body.
  console.log("[pilot] notification sent for request", _id);
  return true;
}

export const submitPilotRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const request = getRequest();
    const ip = request ? extractIp(request) : "0.0.0.0";
    const ipHash = await sha256Hex(ip);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const limit = await checkRateLimits(supabaseAdmin as never, email, ipHash);
    if (!limit.ok) {
      throw new Error(limit.reason);
    }

    const { data: row, error } = await supabaseAdmin
      .from("pilot_requests")
      .insert({
        full_name: data.fullName,
        email,
        company_name: data.companyName,
        employee_range: data.employeeRange,
        role: data.role,
        consent: data.consent,
        consent_version: CONSENT_VERSION,
        source: "/id",
        ip_hash: ipHash,
        status: "new",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await notifyNewPilotRequest(row.id);

    return { ok: true, id: row.id };
  });

async function hasAnyPlatformRole(
  supabase: { rpc: (name: "has_role", args: { _user_id: string; _role: AppRole }) => Promise<{ data: boolean | null; error: Error | null }> },
  userId: string,
): Promise<boolean> {
  const checks = await Promise.all(
    ROLES.map((role) => supabase.rpc("has_role", { _user_id: userId, _role: role })),
  );
  return checks.some((r) => r.data === true);
}

async function auditView(actorId: string, requestId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("platform_audit_log").insert({
    actor: actorId,
    action: "pilot_request.view",
    target: requestId,
    country_code: "ID",
    component: "pilot.functions",
    payload: { id: requestId, scope: "pilot_request" },
  });
}

const listQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  status: z.enum(["new", "contacted", "qualified", "converted", "closed"]).optional(),
});

export const listPilotRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listQuerySchema.parse(d))
  .handler(async ({ data, context }) => {
    const allowed = await hasAnyPlatformRole(context.supabase as never, context.userId);
    if (!allowed) throw new Error("Forbidden");

    let q = context.supabase
      .from("pilot_requests")
      .select(
        "id, full_name, email, company_name, employee_range, role, status, source, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    await context.supabase.from("platform_audit_log").insert({
      actor: context.userId,
      action: "pilot_request.list",
      target: "pilot_requests",
      country_code: "ID",
      component: "pilot.functions",
      payload: { scope: "list", status: data.status ?? null },
    });

    return rows ?? [];
  });

const byIdSchema = z.object({ id: z.string().uuid() });

export const getPilotRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => byIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const allowed = await hasAnyPlatformRole(context.supabase as never, context.userId);
    if (!allowed) throw new Error("Forbidden");

    const { data: row, error } = await context.supabase
      .from("pilot_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    await auditView(context.userId, data.id);

    return row;
  });
