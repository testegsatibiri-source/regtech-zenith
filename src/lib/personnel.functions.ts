// H22 Fase C — 201 File (employee dossier): dependents, job history and a
// completeness checklist. The Core owns the records; country-specific meaning
// (which identifiers matter, which dependents qualify) stays in the pack.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const companyScope = z.object({
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
});

// ---------------------------------------------------------------- dependents

const dependentSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
  fullName: z.string().min(1),
  relationship: z.enum(["spouse", "child", "parent", "sibling", "other"]),
  birthDate: z.string().optional().nullable(),
  isPwd: z.boolean().default(false),
  isStudent: z.boolean().default(false),
  isQualifiedDependent: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export const listDependents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyScope.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("employee_dependents")
      .select("*")
      .eq("company_id", data.companyId)
      .eq("employee_id", data.employeeId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertDependent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dependentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...(data.id ? { id: data.id } : {}),
      company_id: data.companyId,
      employee_id: data.employeeId,
      full_name: data.fullName,
      relationship: data.relationship,
      birth_date: data.birthDate || null,
      is_pwd: data.isPwd,
      is_student: data.isStudent,
      is_qualified_dependent: data.isQualifiedDependent,
      notes: data.notes || null,
    };
    const { data: row, error } = await context.supabase
      .from("employee_dependents")
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDependent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employee_dependents")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------------------------------------------------- job history

const jobHistorySchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  employeeId: z.string().uuid(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  baseSalary: z.number().nonnegative(),
  employmentType: z.string().optional().nullable(),
  effectiveDate: z.string().min(4),
  changeReason: z.enum([
    "hire",
    "promotion",
    "salary_adjustment",
    "regularization",
    "transfer",
    "other",
  ]),
  notes: z.string().optional().nullable(),
});

export const listJobHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyScope.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("employee_job_history")
      .select("*")
      .eq("company_id", data.companyId)
      .eq("employee_id", data.employeeId)
      .order("effective_date", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertJobHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => jobHistorySchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...(data.id ? { id: data.id } : {}),
      company_id: data.companyId,
      employee_id: data.employeeId,
      position: data.position || null,
      department: data.department || null,
      base_salary: data.baseSalary,
      employment_type: data.employmentType || null,
      effective_date: data.effectiveDate,
      change_reason: data.changeReason,
      notes: data.notes || null,
    };
    const { data: row, error } = await context.supabase
      .from("employee_job_history")
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteJobHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employee_job_history")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------- 201 File completeness

export interface DossierCheck {
  code: string;
  label: string;
  passed: boolean;
  detail: string;
}

/**
 * PH-201-FILE heuristic: the dossier is only auditable when the statutory
 * identifiers, the employment timeline and the dependent record exist. Missing
 * items are reported, never inferred.
 */
export const getEmployeeDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companyScope.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [{ data: employee }, deps, jobs, contracts] = await Promise.all([
      supabase
        .from("employees")
        .select("*")
        .eq("id", data.employeeId)
        .eq("company_id", data.companyId)
        .maybeSingle(),
      supabase
        .from("employee_dependents")
        .select("id")
        .eq("employee_id", data.employeeId),
      supabase
        .from("employee_job_history")
        .select("id")
        .eq("employee_id", data.employeeId),
      supabase
        .from("employment_contracts")
        .select("id, status")
        .eq("employee_id", data.employeeId),
    ]);
    if (!employee) throw new Error("Employee not found");

    const meta = (employee.country_metadata ?? {}) as Record<string, unknown>;
    const identifierKeys = Object.keys(meta).filter(
      (k) => typeof meta[k] === "string" && String(meta[k]).trim().length > 0,
    );

    const checks: DossierCheck[] = [
      {
        code: "IDENTIFIERS",
        label: "Statutory identifiers recorded",
        passed: identifierKeys.length > 0,
        detail: identifierKeys.length
          ? `${identifierKeys.length} identifier field(s) on file`
          : "No statutory identifier captured — agency filings will reject this employee",
      },
      {
        code: "JOIN_DATE",
        label: "Hire date recorded",
        passed: Boolean(employee.join_date),
        detail: employee.join_date
          ? String(employee.join_date)
          : "Tenure-based entitlements (SIL, separation pay) cannot be computed",
      },
      {
        code: "CONTRACT",
        label: "Employment contract on file",
        passed: (contracts.data ?? []).length > 0,
        detail: `${(contracts.data ?? []).length} contract record(s)`,
      },
      {
        code: "JOB_HISTORY",
        label: "Job and salary history",
        passed: (jobs.data ?? []).length > 0,
        detail: `${(jobs.data ?? []).length} history entry(ies)`,
      },
      {
        code: "DEPENDENTS",
        label: "Dependents reviewed",
        passed: (deps.data ?? []).length > 0,
        detail: (deps.data ?? []).length
          ? `${(deps.data ?? []).length} dependent(s) recorded`
          : "No dependents recorded — confirm the employee has none before filing benefits",
      },
    ];

    // Solo Parent ID (RA 11861): only asserted when the employee claims the
    // status — the ID is valid for one year and gates parental leave.
    if (meta["solo_parent"]) {
      const idNumber = String(meta["solo_parent_id"] ?? "").trim();
      const expiry = String(meta["solo_parent_id_expiry"] ?? "").trim();
      const today = new Date().toISOString().slice(0, 10);
      const validExpiry = /^\d{4}-\d{2}-\d{2}$/.test(expiry) && expiry >= today;
      checks.push({
        code: "SOLO_PARENT_ID",
        label: "Solo Parent ID valid",
        passed: idNumber.length > 0 && validExpiry,
        detail: !idNumber
          ? "Solo-parent status claimed without an ID number (RA 8972 / RA 11861)"
          : !validExpiry
            ? `Solo Parent ID validity missing or expired (${expiry || "no date"}) — renew yearly`
            : `ID ${idNumber}, valid until ${expiry}`,
      });
    }

    const passed = checks.filter((c) => c.passed).length;
    return {
      employee,
      checks,
      completeness: Math.round((passed / checks.length) * 100),
      complete: passed === checks.length,
    };
  });

// ---------------------------------------------- Solo Parent ID (RA 11861)

const soloParentSchema = companyScope.extend({
  soloParent: z.boolean(),
  idNumber: z.string().trim().max(64).optional().nullable(),
  expiresOn: z.string().trim().max(10).optional().nullable(),
});

/**
 * Persists the Solo Parent ID on `employees.country_metadata`. The PH leave
 * engine gates the 7-day parental leave and the 120-day maternity uplift on a
 * non-expired ID, so the flag alone is never enough.
 */
export const updateSoloParentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => soloParentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: employee, error: readError } = await context.supabase
      .from("employees")
      .select("country_metadata")
      .eq("id", data.employeeId)
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!employee) throw new Error("Employee not found");

    const meta = {
      ...((employee.country_metadata ?? {}) as Record<string, unknown>),
      solo_parent: data.soloParent,
      solo_parent_id: data.soloParent ? data.idNumber || null : null,
      solo_parent_id_expiry: data.soloParent ? data.expiresOn || null : null,
    };

    const { error } = await context.supabase
      .from("employees")
      .update({ country_metadata: meta })
      .eq("id", data.employeeId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, metadata: meta };
  });
