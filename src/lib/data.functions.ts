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
    tax_id: z.string().trim().max(64).optional().nullable(),
  })
  .passthrough()
  .transform(({ name, legal_name, country_code, tax_id }) => ({
    name,
    legal_name: legal_name ?? null,
    country_code: country_code.toUpperCase(),
    tax_id: tax_id ?? null,
  }));

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companySchema.parse(d))
  .handler(async ({ data, context }) => {
    // Re-validate availability at submit time (pack may have degraded) and
    // derive the currency from the pack manifest — never from the client.
    const { assertPackAvailable } = await import("@/lib/packs/loader.server");
    const pack = await assertPackAvailable(data.country_code);

    const { data: row, error } = await context.supabase
      .from("companies")
      .insert({ ...data, currency: pack.currency, owner_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
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
export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("employees")
      .select("*")
      .eq("company_id", data.companyId)
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
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
    const { data: row, error } = await context.supabase
      .from("employees")
      .upsert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
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
      const { error: itemErr } = await context.supabase.from("payroll_items").insert(
        items.map((it) => ({ ...it, run_id: runRow.id, company_id: run.company_id })),
      );
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
