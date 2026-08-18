// H21 Phase 4 — statutory filing exports (Core side).
// The Core never knows a form layout: it assembles payroll facts, asks the
// Country Pack's FilingProvider to render the artifact, hashes it and stores it
// immutably. Submission is recorded out of band (DEBT-023).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CountryRuntime } from "@/sdk";
import type { FilingEmployeeRecord, FilingRequest } from "@/sdk";
import "@/sdk/bootstrap";
import { sha256Hex } from "@/lib/hashing";

export const listFilingForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ country: z.string().min(2).max(2) }).parse(d))
  .handler(async ({ data }) => {
    const pack = CountryRuntime.get(data.country.toUpperCase());
    return pack.providers.filings?.forms() ?? [];
  });

export const listFilings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("statutory_filings")
      .select(
        "id, form_code, form_title, period_year, period_month, status, ruleset_version, pack_version, artifact_filename, artifact_format, artifact_checksum, row_count, totals, warnings, submitted_at, submission_reference, submission_notes, amends_filing_id, created_at",
      )
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getFilingArtifact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ filingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("statutory_filings")
      .select("artifact_filename, artifact_content, artifact_checksum, form_code")
      .eq("id", data.filingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Filing not found");
    return row;
  });

const generateSchema = z.object({
  companyId: z.string().uuid(),
  formCode: z.string().min(2),
  year: z.number().int().min(2020).max(2035),
  month: z.number().int().min(1).max(12).optional(),
  amendsFilingId: z.string().uuid().optional(),
});

export const generateFiling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => generateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: company, error: cErr } = await context.supabase
      .from("companies")
      .select("id, name, legal_name, country_code, statutory_metadata")
      .eq("id", data.companyId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!company) throw new Error("Company not found");

    const countryCode = (company.country_code ?? "PH").toUpperCase();
    const pack = CountryRuntime.get(countryCode);
    const provider = pack.providers.filings;
    if (!provider) {
      throw new Error(`Country Pack ${countryCode} does not provide statutory filing exports`);
    }
    const form = provider.forms().find((f) => f.code === data.formCode);
    if (!form) throw new Error(`Unknown filing form ${data.formCode} for ${countryCode}`);

    // Payroll facts for the period (annual forms aggregate the whole year).
    let runQuery = context.supabase
      .from("payroll_runs")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("period_year", data.year);
    if (form.scope === "period") {
      if (!data.month) throw new Error(`${form.code} requires a period month`);
      runQuery = runQuery.eq("period_month", data.month);
    }
    const { data: runs, error: rErr } = await runQuery;
    if (rErr) throw new Error(rErr.message);
    const runIds = (runs ?? []).map((r) => r.id);

    const { data: items, error: iErr } = runIds.length
      ? await context.supabase
        .from("payroll_items")
        .select("employee_id, employee_name, gross, tax, bpjs_employee, bpjs_employer, net")
        .in("run_id", runIds)
      : { data: [], error: null };
    if (iErr) throw new Error(iErr.message);

    const { data: employees, error: eErr } = await context.supabase
      .from("employees")
      .select("id, full_name, country_metadata")
      .eq("company_id", data.companyId);
    if (eErr) throw new Error(eErr.message);
    const metaById = new Map(
      (employees ?? []).map((e) => [e.id, (e.country_metadata ?? {}) as Record<string, unknown>]),
    );

    // Per-scheme split is not stored on the payroll item (only the aggregate),
    // so it is recomputed from the same ruleset that produced the run.
    const benefits = pack.providers.benefits;
    const records: FilingEmployeeRecord[] = (items ?? []).map((it) => {
      const b = benefits?.calculate({ salary: Number(it.gross) });
      return {
        employeeId: it.employee_id ?? undefined,
        fullName: it.employee_name,
        identifiers: (it.employee_id ? metaById.get(it.employee_id) : {}) ?? {},
        gross: Number(it.gross),
        taxWithheld: Number(it.tax),
        employeeContributions: (b
          ? { sss: b.employee.sss ?? 0, philhealth: b.employee.philhealth ?? 0, pagibig: b.employee.pagibig ?? 0 }
          : { total: Number(it.bpjs_employee) }) as Record<string, number>,
        employerContributions: (b
          ? {
            sss: b.employer.sss ?? 0,
            ec: (b.employer as Record<string, number>).ec ?? 0,
            philhealth: b.employer.philhealth ?? 0,
            pagibig: b.employer.pagibig ?? 0,
          }
          : { total: Number(it.bpjs_employer) }) as Record<string, number>,
        net: Number(it.net),
      };
    });

    const request: FilingRequest = {
      formCode: form.code,
      year: data.year,
      month: form.scope === "period" ? data.month : undefined,
      employer: {
        legalName: company.legal_name ?? company.name,
        statutoryMetadata: (company.statutory_metadata ?? null) as Record<string, unknown> | null,
      },
      employees: records,
    };

    const artifact = provider.generate(request);
    const checksum = await sha256Hex(artifact.content);

    const { data: inserted, error: insErr } = await context.supabase
      .from("statutory_filings")
      .insert({
        company_id: data.companyId,
        country_code: countryCode,
        form_code: artifact.formCode,
        form_title: artifact.title,
        period_year: data.year,
        period_month: form.scope === "period" ? (data.month ?? null) : null,
        run_id: runIds[0] ?? null,
        status: data.amendsFilingId ? "generated" : "generated",
        ruleset_version: artifact.rulesetVersion,
        pack_version: pack.manifest.version,
        artifact_format: artifact.format,
        artifact_filename: artifact.filename,
        artifact_checksum: checksum,
        artifact_content: artifact.content,
        row_count: artifact.rowCount,
        totals: artifact.totals,
        warnings: artifact.warnings,
        amends_filing_id: data.amendsFilingId ?? null,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    if (data.amendsFilingId) {
      // The original stays untouched (legally immutable) — it is only flagged.
      await context.supabase
        .from("statutory_filings")
        .update({ status: "amended" })
        .eq("id", data.amendsFilingId);
    }

    return { id: inserted.id, checksum, warnings: artifact.warnings, rowCount: artifact.rowCount };
  });

export const markFilingSubmitted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        filingId: z.string().uuid(),
        reference: z.string().min(1).max(120),
        notes: z.string().max(1000).optional(),
        submittedAt: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("statutory_filings")
      .update({
        status: "submitted",
        submitted_at: data.submittedAt ?? new Date().toISOString(),
        submission_reference: data.reference,
        submission_notes: data.notes ?? null,
      })
      .eq("id", data.filingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFiling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ filingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("statutory_filings")
      .delete()
      .eq("id", data.filingId)
      .is("submitted_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * DEBT-023 — a filing generated under an older ruleset is never rewritten.
 * It is flagged `stale` so the UI can offer an amended return.
 */
export const flagStaleFilings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: company } = await context.supabase
      .from("companies")
      .select("country_code")
      .eq("id", data.companyId)
      .maybeSingle();
    const pack = CountryRuntime.get((company?.country_code ?? "PH").toUpperCase());
    const current = pack.manifest.rulesetVersion;

    const { data: rows, error } = await context.supabase
      .from("statutory_filings")
      .select("id, ruleset_version, status")
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);

    const stale = (rows ?? []).filter(
      (r) => r.ruleset_version !== current && (r.status === "generated" || r.status === "submitted"),
    );
    for (const row of stale) {
      await context.supabase.from("statutory_filings").update({ status: "stale" }).eq("id", row.id);
    }
    return { current, staleCount: stale.length };
  });
