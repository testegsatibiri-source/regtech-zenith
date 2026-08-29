// H22 Phase D — Data Privacy (RA 10173 / UU PDP readiness).
// Core owns consent records, the personal-data access trail and retention
// policies. Country packs may later attach jurisdiction-specific purposes;
// nothing here hardcodes a country.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const PROCESSING_PURPOSES = [
  "payroll_processing",
  "statutory_reporting",
  "benefits_enrollment",
  "background_check",
  "health_records",
  "third_party_sharing",
] as const;

export const LEGAL_BASES = [
  "consent",
  "contract",
  "legal_obligation",
  "legitimate_interest",
] as const;

export const RETENTION_CATEGORIES = [
  { category: "payroll_records", retentionMonths: 120, legalReference: "NIRC Sec. 235 / BIR RR 17-2013 (10 years)" },
  { category: "statutory_filings", retentionMonths: 120, legalReference: "BIR / SSS record-keeping" },
  { category: "employment_201_file", retentionMonths: 60, legalReference: "DOLE D.O. 183-17 (3 years post-separation, buffered)" },
  { category: "leave_records", retentionMonths: 36, legalReference: "Labor Code Art. 306 (money claims prescriptive period)" },
  { category: "applicant_data", retentionMonths: 12, legalReference: "NPC Advisory 2017-01 (proportionality)" },
] as const;

const companyId = z.object({ companyId: z.string().uuid() });

// ------------------------------------------------------------------ consents

const consentSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
  purpose: z.string().min(1),
  legalBasis: z.enum(LEGAL_BASES).default("consent"),
  granted: z.boolean().default(false),
  evidenceRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const listConsents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    companyId.extend({ employeeId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("employee_consents")
      .select("*")
      .eq("company_id", data.companyId);
    if (data.employeeId) q = q.eq("employee_id", data.employeeId);
    const { data: rows, error } = await q.order("purpose", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => consentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const payload = {
      company_id: data.companyId,
      employee_id: data.employeeId,
      purpose: data.purpose,
      legal_basis: data.legalBasis,
      granted: data.granted,
      granted_at: data.granted ? now : null,
      withdrawn_at: data.granted ? null : now,
      evidence_ref: data.evidenceRef || null,
      notes: data.notes || null,
    };
    const { data: row, error } = await context.supabase
      .from("employee_consents")
      .upsert(payload, { onConflict: "employee_id,purpose" })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("personal_data_access_log").insert({
      company_id: data.companyId,
      employee_id: data.employeeId,
      actor_id: context.userId,
      action: data.granted ? "consent_granted" : "consent_withdrawn",
      resource: `consent:${data.purpose}`,
      purpose: "data_privacy_administration",
    });
    return row;
  });

// ---------------------------------------------------------------- access log

export const logDataAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        employeeId: z.string().uuid().optional().nullable(),
        action: z.string().min(1),
        resource: z.string().min(1),
        purpose: z.string().optional().nullable(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("personal_data_access_log").insert({
      company_id: data.companyId,
      employee_id: data.employeeId || null,
      actor_id: context.userId,
      action: data.action,
      resource: data.resource,
      purpose: data.purpose || null,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDataAccessLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    companyId.extend({ limit: z.number().int().min(1).max(500).default(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("personal_data_access_log")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// --------------------------------------------------------------- retention

const retentionSchema = z.object({
  companyId: z.string().uuid(),
  category: z.string().min(1),
  retentionMonths: z.number().int().min(1).max(600),
  legalReference: z.string().optional().nullable(),
  purgeAction: z.enum(["anonymize", "delete", "archive"]).default("anonymize"),
  active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export const listRetentionPolicies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyId.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("data_retention_policies")
      .select("*")
      .eq("company_id", data.companyId)
      .order("category", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertRetentionPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => retentionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("data_retention_policies")
      .upsert(
        {
          company_id: data.companyId,
          category: data.category,
          retention_months: data.retentionMonths,
          legal_reference: data.legalReference || null,
          purge_action: data.purgeAction,
          active: data.active,
          notes: data.notes || null,
        },
        { onConflict: "company_id,category" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const seedDefaultRetentionPolicies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyId.parse(d))
  .handler(async ({ data, context }) => {
    const rows = RETENTION_CATEGORIES.map((c) => ({
      company_id: data.companyId,
      category: c.category,
      retention_months: c.retentionMonths,
      legal_reference: c.legalReference,
      purge_action: "anonymize",
      active: true,
    }));
    const { error } = await context.supabase
      .from("data_retention_policies")
      .upsert(rows, { onConflict: "company_id,category" });
    if (error) throw new Error(error.message);
    return { seeded: rows.length };
  });

// -------------------------------------------------------- readiness summary

export const getPrivacyReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyId.parse(d))
  .handler(async ({ data, context }) => {
    const [employees, consents, policies, log] = await Promise.all([
      context.supabase.from("employees").select("id, full_name").eq("company_id", data.companyId),
      context.supabase.from("employee_consents").select("employee_id, purpose, granted").eq("company_id", data.companyId),
      context.supabase.from("data_retention_policies").select("category, active").eq("company_id", data.companyId),
      context.supabase
        .from("personal_data_access_log")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId),
    ]);

    const employeeRows = employees.data ?? [];
    const consentRows = consents.data ?? [];
    const required = ["payroll_processing", "statutory_reporting"];
    const covered = new Set(
      consentRows.filter((c) => c.granted).map((c) => `${c.employee_id}:${c.purpose}`),
    );
    const missing = employeeRows.flatMap((e) =>
      required
        .filter((p) => !covered.has(`${e.id}:${p}`))
        .map((p) => ({ employeeId: e.id, employeeName: e.full_name, purpose: p })),
    );

    const activePolicies = (policies.data ?? []).filter((p) => p.active).length;
    const consentScore =
      employeeRows.length === 0
        ? 100
        : Math.round(
            ((employeeRows.length * required.length - missing.length) /
              (employeeRows.length * required.length)) *
              100,
          );
    const retentionScore = Math.round(
      (Math.min(activePolicies, RETENTION_CATEGORIES.length) / RETENTION_CATEGORIES.length) * 100,
    );
    const trailScore = (log.count ?? 0) > 0 ? 100 : 0;
    const overall = Math.round(consentScore * 0.5 + retentionScore * 0.3 + trailScore * 0.2);

    return {
      overall,
      consentScore,
      retentionScore,
      trailScore,
      employeeCount: employeeRows.length,
      activePolicies,
      accessLogEntries: log.count ?? 0,
      missingConsents: missing.slice(0, 50),
      missingConsentCount: missing.length,
    };
  });
