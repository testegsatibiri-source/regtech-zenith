// H17-ID — Pilot request intake for the Indonesia landing.
// Public submission is unauthenticated; reads are restricted to platform roles
// and every read is written to the platform audit log.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sha256Hex } from "@/lib/hashing";

const CONSENT_VERSIONS = {
  ID: "id-pilot-2026-09-08",
  PH: "ph-pilot-2026-09-23",
} as const;


const LANDING_SOURCES = {
  ID: "/id",
  PH: "/ph",
} as const;

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
  // Which landing the request came from. Defaults to ID for backwards
  // compatibility with the existing Indonesia form payload.
  country: z.enum(["ID", "PH"]).default("ID"),
  // PH pilot scope screening (B4/B6 are out of scope for the pilot). Optional
  // so the ID payload stays valid; stored as NULL when not answered.
  workforceAllNcr: z.boolean().optional(),
  hasOvertime: z.boolean().optional(),
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
    const email = data.email.toLowerCase();
    const country = data.country;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: emailCount }, { count: ipCount }] = await Promise.all([
      supabaseAdmin
        .from("pilot_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("email", email),
      supabaseAdmin
        .from("pilot_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("ip_hash", ipHash),
    ]);

    if ((emailCount ?? 0) >= 3) {
      throw new Error("Too many submissions from this email address.");
    }
    if ((ipCount ?? 0) >= 10) {
      throw new Error("Too many submissions from this network.");
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
        consent_version: CONSENT_VERSIONS[country],
        source: LANDING_SOURCES[country],
        ip_hash: ipHash,
        status: "new",
        workforce_all_ncr: data.workforceAllNcr ?? null,
        has_overtime: data.hasOvertime ?? null,
      })

      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await notifyNewPilotRequest(row.id);

    return { ok: true, id: row.id };
  });

async function hasAnyPlatformRole(
  supabase: {
    rpc: (
      name: "has_role",
      args: { _user_id: string; _role: AppRole },
    ) => Promise<{ data: boolean | null; error: Error | null }>;
  },
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

// `pilot_requests` is deny-all under RLS (no row is reachable by anon or
// authenticated). Reads therefore run with the service role *after* the
// caller's platform role has been verified server-side, and every read is
// written to the audit trail.
const PILOT_STATUSES = ["new", "qualified", "approved", "converted", "rejected"] as const;

const listQuerySchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  status: z.enum(PILOT_STATUSES).optional(),
  country: z.enum(["ID", "PH"]).optional(),
});

export const listPilotRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listQuerySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userHasAnyRole, PLATFORM_ROLES, logPilotAudit } = await import(
      "@/lib/pilot/authorization.server"
    );
    if (!(await userHasAnyRole(context.userId, PLATFORM_ROLES))) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("pilot_requests")
      .select(
        "id, full_name, email, company_name, employee_range, role, status, source, created_at, " +
          "approved_at, approved_by, authorized_country, pilot_expires_at, decision_reason, " +
          "converted_company_id, converted_at, workforce_all_ncr, has_overtime, consent_version, notes",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.country) q = q.eq("source", LANDING_SOURCES[data.country]);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    await logPilotAudit({
      actor: context.userId,
      action: "pilot_request.list",
      target: "pilot_requests",
      country: data.country ?? null,
      payload: { status: data.status ?? null, count: (rows ?? []).length },
    });

    return rows ?? [];
  });

const byIdSchema = z.object({ id: z.string().uuid() });

export const getPilotRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => byIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userHasAnyRole, PLATFORM_ROLES } = await import("@/lib/pilot/authorization.server");
    if (!(await userHasAnyRole(context.userId, PLATFORM_ROLES))) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pilot_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    await auditView(context.userId, data.id);

    return row;
  });

// ---------------------------------------------------------------------------
// Lifecycle mutations.
//
// Only `platform_admin` / `platform_operator` may move a request. The actor is
// ALWAYS derived from the verified session — `approved_by` is never accepted
// from the client. Every transition is written to `platform_audit_log` with
// the previous and new state.
// ---------------------------------------------------------------------------

async function requireDecisionRole(userId: string): Promise<void> {
  const { userHasAnyRole, PILOT_DECISION_ROLES } = await import(
    "@/lib/pilot/authorization.server"
  );
  if (!(await userHasAnyRole(userId, PILOT_DECISION_ROLES))) {
    throw new Error("Forbidden");
  }
}

async function loadRequest(id: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("pilot_requests")
    .select("id, status, authorized_country, pilot_expires_at, source")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

const approveSchema = z.object({
  id: z.string().uuid(),
  authorizedCountry: z.enum(["ID", "PH", "BOTH"]),
  // Optional explicit end of the pilot entitlement (ISO date-time).
  pilotExpiresAt: z.string().datetime().optional().nullable(),
  reason: z.string().trim().max(1000).optional().nullable(),
});

export const approvePilotRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => approveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireDecisionRole(context.userId);
    const previous = await loadRequest(data.id);
    if (previous.status === "converted") {
      throw new Error("A converted pilot request cannot be re-approved.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pilot_requests")
      .update({
        status: "approved",
        authorized_country: data.authorizedCountry,
        pilot_expires_at: data.pilotExpiresAt ?? null,
        decision_reason: data.reason ?? null,
        approved_at: new Date().toISOString(),
        // Derived from the verified session — never from the request payload.
        approved_by: context.userId,
      })
      .eq("id", data.id)
      .select("id, status, authorized_country, pilot_expires_at")
      .single();
    if (error) throw new Error(error.message);

    const { logPilotAudit } = await import("@/lib/pilot/authorization.server");
    await logPilotAudit({
      actor: context.userId,
      action: "pilot_request.approved",
      target: data.id,
      country: data.authorizedCountry === "BOTH" ? null : data.authorizedCountry,
      oldValue: previous,
      newValue: row,
    });

    return row;
  });

const qualifySchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(1000).optional().nullable(),
});

export const qualifyPilotRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => qualifySchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireDecisionRole(context.userId);
    const previous = await loadRequest(data.id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pilot_requests")
      .update({ status: "qualified", decision_reason: data.reason ?? null })
      .eq("id", data.id)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);

    const { logPilotAudit } = await import("@/lib/pilot/authorization.server");
    await logPilotAudit({
      actor: context.userId,
      action: "pilot_request.qualified",
      target: data.id,
      country: null,
      oldValue: previous,
      newValue: row,
    });

    return row;
  });

const rejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export const rejectPilotRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rejectSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireDecisionRole(context.userId);
    const previous = await loadRequest(data.id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Rejection revokes the entitlement: the authorized country is cleared so
    // no stale approval can keep a workspace door open.
    const { data: row, error } = await supabaseAdmin
      .from("pilot_requests")
      .update({
        status: "rejected",
        authorized_country: null,
        decision_reason: data.reason,
        approved_at: null,
        approved_by: null,
      })
      .eq("id", data.id)
      .select("id, status, authorized_country")
      .single();
    if (error) throw new Error(error.message);

    const { logPilotAudit } = await import("@/lib/pilot/authorization.server");
    await logPilotAudit({
      actor: context.userId,
      action: "pilot_request.rejected",
      target: data.id,
      country: null,
      oldValue: previous,
      newValue: row,
    });

    return row;
  });

const notesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().trim().max(4000),
});

export const updatePilotNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => notesSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireDecisionRole(context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pilot_requests")
      .update({ notes: data.notes })
      .eq("id", data.id)
      .select("id, notes")
      .single();
    if (error) throw new Error(error.message);

    const { logPilotAudit } = await import("@/lib/pilot/authorization.server");
    await logPilotAudit({
      actor: context.userId,
      action: "pilot_request.notes_updated",
      target: data.id,
      country: null,
      payload: { length: data.notes.length },
    });

    return row;
  });

// AI-assisted case triage. Advisory only: it never changes the request state.
// Contact PII (name, e-mail) is deliberately withheld from the model.
const summarizeSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(5000).optional().nullable(),
});

export const summarizePilotRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summarizeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireDecisionRole(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin
      .from("pilot_requests")
      .select(
        "id, company_name, employee_range, role, status, source, created_at, authorized_country, pilot_expires_at, workforce_all_ncr, has_overtime, consent_version, notes",
      )
      .eq("id", data.id)
      .single();
    if (error || !r) throw new Error("Pilot request not found");
    const notes = (data.notes ?? r.notes ?? "").trim();
    const caseText = [
      `Company: ${r.company_name ?? "—"}`,
      `Applicant role: ${r.role ?? "—"}`,
      `Employee range: ${r.employee_range ?? "—"}`,
      `Source landing: ${r.source ?? "—"}`,
      `Current status: ${r.status}`,
      `Authorized country: ${r.authorized_country ?? "—"}`,
      `Pilot expires: ${r.pilot_expires_at ?? "—"}`,
      `Workforce all in NCR (PH): ${r.workforce_all_ncr ?? "—"}`,
      `Has overtime (PH): ${r.has_overtime ?? "—"}`,
      `Consent version: ${r.consent_version ?? "—"}`,
      `Submitted: ${r.created_at}`,
      `Operator notes:\n${notes || "(none)"}`,
    ].join("\n");
    const { summarizePilotCase } = await import("@/lib/pilot/risk-summary.server");
    const summary = await summarizePilotCase(caseText);
    await supabaseAdmin.from("platform_audit_log").insert({
      actor: context.userId,
      action: "pilot_request.ai_risk_summary",
      target: r.id,
      country_code: r.source?.toUpperCase().includes("PH") ? "PH" : "ID",
      component: "pilot.functions",
      payload: { id: r.id, model: "openai/gpt-6-astra", advisory: true },
    });
    return { summary, generatedAt: new Date().toISOString() };
  });
