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
  {
    category: "payroll_records",
    retentionMonths: 120,
    legalReference: "NIRC Sec. 235 / BIR RR 17-2013 (10 years)",
  },
  {
    category: "statutory_filings",
    retentionMonths: 120,
    legalReference: "BIR / SSS record-keeping",
  },
  {
    category: "employment_201_file",
    retentionMonths: 60,
    legalReference: "DOLE D.O. 183-17 (3 years post-separation, buffered)",
  },
  {
    category: "leave_records",
    retentionMonths: 36,
    legalReference: "Labor Code Art. 306 (money claims prescriptive period)",
  },
  {
    category: "applicant_data",
    retentionMonths: 12,
    legalReference: "NPC Advisory 2017-01 (proportionality)",
  },
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
    let q = context.supabase.from("employee_consents").select("*").eq("company_id", data.companyId);
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
      context.supabase
        .from("employee_consents")
        .select("employee_id, purpose, granted")
        .eq("company_id", data.companyId),
      context.supabase
        .from("data_retention_policies")
        .select("category, active")
        .eq("company_id", data.companyId),
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

// ------------------------------------------------ Indonesian retention (UU PDP)
// UU 27/2022 has no single retention table: the periods below come from the
// obligations that force the record to exist (tax, manpower, social security).
export const RETENTION_CATALOG_ID = [
  {
    category: "payroll_records",
    retentionMonths: 120,
    legalReference: "UU KUP Pasal 28(11) — 10 tahun pembukuan",
  },
  {
    category: "statutory_filings",
    retentionMonths: 120,
    legalReference: "UU KUP Pasal 28(11) — SPT/bukti potong PPh 21",
  },
  {
    category: "employment_file",
    retentionMonths: 60,
    legalReference: "UU 13/2003 Pasal 96 (kedaluwarsa) + UU 11/2020",
  },
  {
    category: "bpjs_records",
    retentionMonths: 120,
    legalReference: "PP 44/2015 & PP 45/2015 — bukti iuran",
  },
  {
    category: "leave_records",
    retentionMonths: 36,
    legalReference: "UU 13/2003 — hak cuti dan pembuktian",
  },
  {
    category: "applicant_data",
    retentionMonths: 12,
    legalReference: "UU 27/2022 Pasal 16(1)f — retensi sesuai tujuan",
  },
] as const;

export const listRetentionCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ countryCode: z.string().min(2).max(2).default("PH") }).parse(d),
  )
  .handler(async ({ data }) =>
    data.countryCode.toUpperCase() === "ID"
      ? [...RETENTION_CATALOG_ID]
      : RETENTION_CATEGORIES.map((c) => ({ ...c })),
  );

export const seedRetentionPoliciesForCountry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), countryCode: z.string().min(2).max(2) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const catalog =
      data.countryCode.toUpperCase() === "ID"
        ? RETENTION_CATALOG_ID
        : (RETENTION_CATEGORIES as readonly {
            category: string;
            retentionMonths: number;
            legalReference: string;
          }[]);
    const rows = catalog.map((c) => ({
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

// ------------------------------------------------------------------- DPO

const dpoSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  jurisdiction: z.string().min(2).max(2).default("ID"),
  appointedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const listDataProtectionOfficers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyId.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("data_protection_officers")
      .select("*")
      .eq("company_id", data.companyId)
      .order("jurisdiction");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertDataProtectionOfficer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dpoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...(data.id ? { id: data.id } : {}),
      company_id: data.companyId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone ?? null,
      jurisdiction: data.jurisdiction.toUpperCase(),
      ...(data.appointedAt ? { appointed_at: data.appointedAt } : {}),
      notes: data.notes ?? null,
    };
    const { data: row, error } = await context.supabase
      .from("data_protection_officers")
      .upsert(payload, { onConflict: "company_id,jurisdiction" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ------------------------------------------------------- privacy incidents

export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const INCIDENT_STATUSES = ["open", "contained", "notified", "closed"] as const;

const incidentSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  severity: z.enum(INCIDENT_SEVERITIES).default("medium"),
  status: z.enum(INCIDENT_STATUSES).default("open"),
  detectedAt: z.string().optional().nullable(),
  affectedCount: z.number().int().nonnegative().default(0),
  authorityNotifiedAt: z.string().optional().nullable(),
  subjectsNotifiedAt: z.string().optional().nullable(),
  containment: z.string().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const listPrivacyIncidents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyId.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("privacy_incidents")
      .select("*")
      .eq("company_id", data.companyId)
      .order("detected_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertPrivacyIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => incidentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...(data.id ? { id: data.id } : {}),
      company_id: data.companyId,
      title: data.title,
      description: data.description ?? null,
      severity: data.severity,
      status: data.status,
      ...(data.detectedAt ? { detected_at: data.detectedAt } : {}),
      affected_count: data.affectedCount,
      authority_notified_at: data.authorityNotifiedAt ?? null,
      subjects_notified_at: data.subjectsNotifiedAt ?? null,
      containment: data.containment ?? null,
      root_cause: data.rootCause ?? null,
      notes: data.notes ?? null,
    };
    const { data: row, error } = await context.supabase
      .from("privacy_incidents")
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// --------------------------------------------------- data subject requests

export const DSR_TYPES = [
  "access",
  "rectification",
  "erasure",
  "objection",
  "portability",
] as const;
export const DSR_STATUSES = ["received", "in_progress", "fulfilled", "rejected"] as const;

const dsrSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
  requestType: z.enum(DSR_TYPES),
  requesterName: z.string().optional().nullable(),
  requesterEmail: z.string().email().optional().nullable(),
  status: z.enum(DSR_STATUSES).default("received"),
  dueAt: z.string().optional().nullable(),
  resolvedAt: z.string().optional().nullable(),
  resolution: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const listDataSubjectRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyId.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("data_subject_requests")
      .select("*")
      .eq("company_id", data.companyId)
      .order("received_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertDataSubjectRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dsrSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...(data.id ? { id: data.id } : {}),
      company_id: data.companyId,
      employee_id: data.employeeId ?? null,
      request_type: data.requestType,
      requester_name: data.requesterName ?? null,
      requester_email: data.requesterEmail ?? null,
      status: data.status,
      ...(data.dueAt ? { due_at: data.dueAt } : {}),
      resolved_at: data.resolvedAt ?? null,
      resolution: data.resolution ?? null,
      notes: data.notes ?? null,
    };
    const { data: row, error } = await context.supabase
      .from("data_subject_requests")
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ------------------------------------------------- field encryption status

export const getFieldEncryptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyId.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: company }, { data: rows, error }] = await Promise.all([
      context.supabase
        .from("companies")
        .select("country_code")
        .eq("id", data.companyId)
        .maybeSingle(),
      context.supabase
        .from("employees")
        .select("id, full_name, country_metadata")
        .eq("company_id", data.companyId),
    ]);
    if (error) throw new Error(error.message);

    const { sensitiveFieldsFor } = await import("@/lib/privacy/sensitive-fields");
    const { isSealedField, keyRingAvailable } = await import("@/lib/privacy/field-crypto.server");
    const specs = sensitiveFieldsFor(company?.country_code ?? null);

    let sealed = 0;
    let plaintext = 0;
    const pending: { employeeId: string; employeeName: string; fields: string[] }[] = [];
    for (const row of rows ?? []) {
      const metadata = (row.country_metadata ?? {}) as Record<string, unknown>;
      const stillPlain: string[] = [];
      for (const spec of specs) {
        const value = metadata[spec.key];
        if (isSealedField(value)) sealed += 1;
        else if (typeof value === "string" && value.trim() !== "") {
          plaintext += 1;
          stillPlain.push(spec.key);
        }
      }
      if (stillPlain.length) {
        pending.push({ employeeId: row.id, employeeName: row.full_name, fields: stillPlain });
      }
    }

    return {
      countryCode: company?.country_code ?? null,
      keyConfigured: keyRingAvailable(),
      trackedFields: specs.map((s) => s.key),
      sealed,
      plaintext,
      pending: pending.slice(0, 50),
      pendingCount: pending.length,
    };
  });

/** Seals every sensitive value still stored as plaintext. Idempotent. */
export const migrateSensitiveFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyId.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: company }, { data: rows, error }] = await Promise.all([
      context.supabase
        .from("companies")
        .select("country_code")
        .eq("id", data.companyId)
        .maybeSingle(),
      context.supabase
        .from("employees")
        .select("id, country_metadata")
        .eq("company_id", data.companyId),
    ]);
    if (error) throw new Error(error.message);

    const { sensitiveFieldsFor } = await import("@/lib/privacy/sensitive-fields");
    const { loadKeyRing, sealMetadata, isSealedField } =
      await import("@/lib/privacy/field-crypto.server");
    const specs = sensitiveFieldsFor(company?.country_code ?? null);
    if (!specs.length) return { migrated: 0, employeesTouched: 0 };

    const ring = await loadKeyRing();
    let migrated = 0;
    let employeesTouched = 0;

    for (const row of rows ?? []) {
      const metadata = (row.country_metadata ?? {}) as Record<string, unknown>;
      const toSeal = specs.filter((spec) => {
        const value = metadata[spec.key];
        return !isSealedField(value) && typeof value === "string" && value.trim() !== "";
      });
      if (!toSeal.length) continue;
      const { metadata: next } = await sealMetadata(metadata, toSeal, ring);
      const { error: updateError } = await context.supabase
        .from("employees")
        .update({ country_metadata: next as never })
        .eq("id", row.id)
        .eq("company_id", data.companyId);
      if (updateError) throw new Error(updateError.message);
      migrated += toSeal.length;
      employeesTouched += 1;
    }

    await context.supabase.from("personal_data_access_log").insert({
      company_id: data.companyId,
      actor_id: context.userId,
      action: "seal_sensitive_fields",
      resource: "employees.country_metadata",
      purpose: "security_measure",
      metadata: { migrated, employeesTouched } as never,
    });

    return { migrated, employeesTouched };
  });
