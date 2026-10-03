import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Companies ----------
export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// H18.5 — the client never chooses the currency, and `country_code` is an
// explicit, backend-validated choice. A legacy `currency` field in the payload
// is accepted and ignored (DEBT-023) so older clients keep working.
const companySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    legal_name: z.string().trim().max(160).optional().nullable(),
    country_code: z.string().trim().length(2),
    organization_id: z.string().uuid().optional(),
    tax_id: z.string().trim().max(64).optional().nullable(),
  })
  .passthrough()
  .transform(({ name, legal_name, country_code, organization_id, tax_id }) => ({
    name,
    legal_name: legal_name ?? null,
    country_code: country_code.toUpperCase(),
    organization_id,
    tax_id: tax_id ?? null,
  }));

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companySchema.parse(d))
  .handler(async ({ data, context }) => {
    // --- Pilot authorization boundary -------------------------------------
    // The platform is in homologation: only approved Pilot Program
    // participants (or platform staff) may create a workspace, and only in
    // the jurisdiction their approval covers. This runs BEFORE any write and
    // is the real control — the UI gate is only UX. A client that calls this
    // RPC directly, or signs in through Google, hits exactly this check.
    const { authorizePilotCountry, logPilotAudit } =
      await import("@/lib/pilot/authorization.server");
    const { DENIAL_MESSAGES } = await import("@/lib/pilot/authorization");

    const auth = await authorizePilotCountry({
      userId: context.userId,
      claims: context.claims as unknown as Record<string, unknown>,
      country: data.country_code,
    });

    if (!auth.allowed) {
      await logPilotAudit({
        actor: context.userId,
        action: "pilot_request.company_creation_denied",
        target: auth.decision.requestId,
        country: data.country_code,
        payload: { reason: auth.decision.reason },
      });
      throw new Error(DENIAL_MESSAGES[auth.decision.reason]);
    }

    // Re-validate availability at submit time (pack may have degraded) and
    // derive the currency from the pack manifest — never from the client.
    const { assertPackAvailable } = await import("@/lib/packs/loader.server");
    const pack = await assertPackAvailable(data.country_code);

    // Commercial tenancy boundary: company creation must belong to an active
    // organization membership and respect that organization's company entitlement.
    const orgQuery = context.supabase
      .from("organization_members")
      .select("organization_id, organizations!inner(status)")
      .eq("user_id", context.userId)
      .eq("status", "ACTIVE");
    const { data: memberships, error: membershipError } = await orgQuery;
    if (membershipError) throw new Error(membershipError.message);

    const requestedOrganizationId = data.organization_id;
    const eligible = (memberships ?? []).filter(
      (m) => (m.organizations as { status: string }).status === "ACTIVE",
    );
    const organizationId = requestedOrganizationId
      ? eligible.find((m) => m.organization_id === requestedOrganizationId)?.organization_id
      : eligible.length === 1
        ? eligible[0].organization_id
        : undefined;

    if (!organizationId) {
      throw new Error(
        requestedOrganizationId
          ? "You are not an active member of this organization."
          : "Select an active organization before creating a company.",
      );
    }

    const { data: canCreate, error: entitlementError } = await context.supabase.rpc(
      "can_add_company",
      { _organization_id: organizationId },
    );
    if (entitlementError) throw new Error(entitlementError.message);
    if (!canCreate) throw new Error("The organization's company entitlement does not allow another company.");

    const { data: row, error } = await context.supabase
      .from("companies")
      .insert({
        name: data.name,
        legal_name: data.legal_name,
        country_code: data.country_code,
        tax_id: data.tax_id,
        currency: pack.currency,
        owner_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: linkError } = await context.supabase
      .from("organization_companies")
      .insert({
        organization_id: organizationId,
        company_id: row.id,
        relationship_type: "OWNER",
        status: "ACTIVE",
      });
    if (linkError) {
      await context.supabase.from("companies").delete().eq("id", row.id);
      throw new Error(linkError.message);
    }

    // Idempotent conversion: an approved request becomes `converted` once, and
    // keeps its entitlement (converted still authorizes the same country).
    if (auth.via === "pilot") {
      const { markPilotRequestConverted } = await import("@/lib/pilot/authorization.server");
      await markPilotRequestConverted(auth.requestId, row.id, context.userId);
    }

    await logPilotAudit({
      actor: context.userId,
      action: "pilot_request.company_created",
      target: auth.via === "pilot" ? auth.requestId : null,
      country: data.country_code,
      payload: { via: auth.via, companyId: row.id },
    });

    return row;
  });

// H21 Phase 2 — employer statutory registry (TIN/RDO/SSS/PhilHealth/Pag-IBIG
// employer numbers). Stored as opaque per-jurisdiction JSON so Core stays
// country-agnostic; the active Country Pack owns the keys and their formats.
const statutorySchema = z.object({
  companyId: z.string().uuid(),
  statutory_metadata: z.record(z.string(), z.string().trim().max(64)),
});

export const updateCompanyStatutory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statutorySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("companies")
      .update({ statutory_metadata: data.statutory_metadata })
      .eq("id", data.companyId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Employees ----------
// H23 Fase D — NIK/NPWP/bank account are sealed at rest (AES-GCM, key outside
// the database) and never leave the server in the clear. Lists carry a mask;
// the full value only comes back through `revealEmployeeField`, which writes
// to the personal-data access trail.

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: rows, error }, { data: company }] = await Promise.all([
      context.supabase
        .from("employees")
        .select("*")
        .eq("company_id", data.companyId)
        .order("full_name", { ascending: true }),
      context.supabase
        .from("companies")
        .select("country_code")
        .eq("id", data.companyId)
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    const { maskEmployeeRow } = await import("@/lib/privacy/employee-sensitive.server");
    return (rows ?? []).map((row) => maskEmployeeRow(row, company?.country_code ?? null));
  });

const employeeSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid(),
  full_name: z.string().min(1),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  employment_type: z.string().default("permanent"),
  base_salary: z.number().nonnegative(),
  religion: z.string().optional().nullable(),
  marital_status: z.string().default("TK/0"),
  join_date: z.string().optional().nullable(),
  status: z.string().default("active"),
  country_metadata: z.record(z.string(), z.any()).default({}),
});

export const upsertEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => employeeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: company } = await context.supabase
      .from("companies")
      .select("country_code")
      .eq("id", data.company_id)
      .maybeSingle();
    const countryCode = company?.country_code ?? null;

    const { sensitiveFieldsFor } = await import("@/lib/privacy/sensitive-fields");
    const specs = sensitiveFieldsFor(countryCode);
    let metadata = data.country_metadata as Record<string, unknown>;

    if (specs.length) {
      const { loadKeyRing, sealMetadata, isSealedField } =
        await import("@/lib/privacy/field-crypto.server");
      // A mask coming back from the client must never overwrite a stored value.
      if (data.id) {
        const { data: current } = await context.supabase
          .from("employees")
          .select("country_metadata")
          .eq("id", data.id)
          .maybeSingle();
        const stored = (current?.country_metadata ?? {}) as Record<string, unknown>;
        const merged: Record<string, unknown> = { ...metadata };
        for (const spec of specs) {
          const incoming = merged[spec.key];
          if (typeof incoming === "string" && incoming.includes("•")) {
            merged[spec.key] = stored[spec.key] ?? "";
          } else if (isSealedField(incoming)) {
            merged[spec.key] = stored[spec.key] ?? "";
          }
        }
        metadata = merged;
      }
      const ring = await loadKeyRing();
      metadata = (await sealMetadata(metadata, specs, ring)).metadata;
    }

    const { data: row, error } = await context.supabase
      .from("employees")
      .upsert({ ...data, country_metadata: metadata as never })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { maskEmployeeRow } = await import("@/lib/privacy/employee-sensitive.server");
    return maskEmployeeRow(row, countryCode);
  });

/**
 * Audited reveal of a single sensitive identifier. Every call appends to
 * `personal_data_access_log` (UU PDP art. 31 accountability).
 */
export const revealEmployeeField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        employeeId: z.string().uuid(),
        field: z.string().min(1).max(64),
        purpose: z.string().max(120).default("payroll_processing"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [{ data: employee, error }, { data: company }] = await Promise.all([
      context.supabase
        .from("employees")
        .select("id, country_metadata")
        .eq("id", data.employeeId)
        .eq("company_id", data.companyId)
        .maybeSingle(),
      context.supabase
        .from("companies")
        .select("country_code")
        .eq("id", data.companyId)
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    if (!employee) throw new Error("Employee not found.");

    const { sensitiveFieldSpec } = await import("@/lib/privacy/sensitive-fields");
    const spec = sensitiveFieldSpec(company?.country_code ?? null, data.field);
    if (!spec) throw new Error("Field is not a declared sensitive identifier.");

    const { loadKeyRing } = await import("@/lib/privacy/field-crypto.server");
    const { revealField } = await import("@/lib/privacy/employee-sensitive.server");
    const ring = await loadKeyRing();
    const opened = await revealField(
      (employee.country_metadata ?? {}) as Record<string, unknown>,
      data.field,
      ring,
    );

    await context.supabase.from("personal_data_access_log").insert({
      company_id: data.companyId,
      employee_id: data.employeeId,
      actor_id: context.userId,
      action: "reveal_sensitive_field",
      resource: `employees.country_metadata.${data.field}`,
      purpose: data.purpose,
      metadata: {
        legal_basis: spec.legalBasis,
        sealed: opened?.sealed ?? null,
        found: Boolean(opened),
      } as never,
    });

    if (!opened) return { value: null, sealed: false };
    return { value: opened.value, sealed: opened.sealed };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("employees").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Payroll ----------
const payrollSchema = z.object({
  company_id: z.string().uuid(),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int(),
  country_code: z.string().default("ID"),
  compliance_score: z.number().int().min(0).max(100),
  totals: z.record(z.string(), z.any()).default({}),
  items: z.array(
    z.object({
      employee_id: z.string().uuid().nullable().optional(),
      employee_name: z.string(),
      gross: z.number(),
      tax: z.number(),
      bpjs_employee: z.number(),
      bpjs_employer: z.number(),
      net: z.number(),
      breakdown: z.record(z.string(), z.any()).default({}),
    }),
  ),
});

export const savePayrollRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => payrollSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { items, ...run } = data;
    const { data: runRow, error } = await context.supabase
      .from("payroll_runs")
      .insert({ ...run, status: "finalized" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (items.length) {
      const { error: itemErr } = await context.supabase
        .from("payroll_items")
        .insert(items.map((it) => ({ ...it, run_id: runRow.id, company_id: run.company_id })));
      if (itemErr) throw new Error(itemErr.message);
    }
    return runRow;
  });

export const listPayrollRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("payroll_runs")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
