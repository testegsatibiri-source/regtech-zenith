// H23 Fase D (D5b) — Retention purge engine.
// Executes `data_retention_policies` against the records they govern.
// Server-only: uses the admin client, runs from a scheduled public route or
// from an authenticated server function. Every execution is written to the
// append-only `personal_data_access_log`.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ALL_SENSITIVE_KEYS } from "./sensitive-fields";

export type PurgeAction = "anonymize" | "delete" | "archive";

export interface CategoryPlan {
  category: string;
  supported: boolean;
  /** Why a category cannot be purged automatically (immutability, no source). */
  reason?: string;
}

export interface CategoryOutcome extends CategoryPlan {
  companyId: string;
  retentionMonths: number;
  cutoff: string;
  action: PurgeAction;
  matched: number;
  affected: number;
  dryRun: boolean;
  error?: string;
}

export interface PurgeReport {
  ranAt: string;
  dryRun: boolean;
  companies: number;
  policies: number;
  matched: number;
  affected: number;
  outcomes: CategoryOutcome[];
}

const UNSUPPORTED: Record<string, string> = {
  statutory_filings: "Statutory filings are immutable by law (ADR-0037); retention is archival only.",
  bpjs_records: "Contribution evidence is derived from payroll records; purged with payroll_records.",
  applicant_data: "No applicant records are stored by the platform yet.",
};

function cutoffDate(retentionMonths: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - retentionMonths);
  return d;
}

function stripSensitive(metadata: unknown): Record<string, string | number | boolean | null> {
  const src = (metadata ?? {}) as Record<string, unknown>;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(src)) {
    if (ALL_SENSITIVE_KEYS.includes(k)) continue;
    out[k] = v as string | number | boolean | null;
  }
  out["_purged_at"] = new Date().toISOString();
  return out;
}

async function purgePayroll(
  companyId: string,
  cutoff: string,
  action: PurgeAction,
  dryRun: boolean,
): Promise<{ matched: number; affected: number }> {
  const { data: rows, error } = await supabaseAdmin
    .from("payroll_items")
    .select("id")
    .eq("company_id", companyId)
    .lt("created_at", cutoff);
  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((r) => r.id);
  if (dryRun || ids.length === 0 || action === "archive") {
    return { matched: ids.length, affected: 0 };
  }
  if (action === "delete") {
    const { error: delErr } = await supabaseAdmin.from("payroll_items").delete().in("id", ids);
    if (delErr) throw new Error(delErr.message);
  } else {
    const { error: updErr } = await supabaseAdmin
      .from("payroll_items")
      .update({ employee_name: "[purged]", employee_id: null, breakdown: {} })
      .in("id", ids);
    if (updErr) throw new Error(updErr.message);
  }
  return { matched: ids.length, affected: ids.length };
}

async function purgeLeave(
  companyId: string,
  cutoff: string,
  action: PurgeAction,
  dryRun: boolean,
): Promise<{ matched: number; affected: number }> {
  const { data: rows, error } = await supabaseAdmin
    .from("leave_requests")
    .select("id")
    .eq("company_id", companyId)
    .lt("created_at", cutoff);
  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((r) => r.id);
  if (dryRun || ids.length === 0 || action === "archive") {
    return { matched: ids.length, affected: 0 };
  }
  if (action === "delete") {
    const { error: delErr } = await supabaseAdmin.from("leave_requests").delete().in("id", ids);
    if (delErr) throw new Error(delErr.message);
  } else {
    const { error: updErr } = await supabaseAdmin
      .from("leave_requests")
      .update({ reason: null, metadata: {} })
      .in("id", ids);
    if (updErr) throw new Error(updErr.message);
  }
  return { matched: ids.length, affected: ids.length };
}

/** Employment file: strips sensitive identifiers from separated employees. */
async function purgeEmploymentFile(
  companyId: string,
  cutoff: string,
  action: PurgeAction,
  dryRun: boolean,
): Promise<{ matched: number; affected: number }> {
  const { data: rows, error } = await supabaseAdmin
    .from("employees")
    .select("id, country_metadata")
    .eq("company_id", companyId)
    .neq("status", "active")
    .lt("updated_at", cutoff);
  if (error) throw new Error(error.message);
  const candidates = rows ?? [];
  if (dryRun || candidates.length === 0 || action === "archive") {
    return { matched: candidates.length, affected: 0 };
  }
  if (action === "delete") {
    const { error: delErr } = await supabaseAdmin
      .from("employees")
      .delete()
      .in(
        "id",
        candidates.map((c) => c.id),
      );
    if (delErr) throw new Error(delErr.message);
    return { matched: candidates.length, affected: candidates.length };
  }
  let affected = 0;
  for (const row of candidates) {
    const { error: updErr } = await supabaseAdmin
      .from("employees")
      .update({ country_metadata: stripSensitive(row.country_metadata) })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    affected += 1;
  }
  return { matched: candidates.length, affected };
}

type Handler = (
  companyId: string,
  cutoff: string,
  action: PurgeAction,
  dryRun: boolean,
) => Promise<{ matched: number; affected: number }>;

const HANDLERS: Record<string, Handler> = {
  payroll_records: purgePayroll,
  leave_records: purgeLeave,
  employment_file: purgeEmploymentFile,
  employment_201_file: purgeEmploymentFile,
};

export interface RunPurgeOptions {
  /** Restrict to a single company; omit to sweep every company. */
  companyId?: string;
  /** Report only; nothing is written. */
  dryRun?: boolean;
  /** Who triggered the run (uuid) — null for the scheduled job. */
  actorId?: string | null;
  source: "scheduled" | "manual";
}

export async function runRetentionPurge(options: RunPurgeOptions): Promise<PurgeReport> {
  const dryRun = options.dryRun ?? false;
  let query = supabaseAdmin
    .from("data_retention_policies")
    .select("company_id, category, retention_months, purge_action, active")
    .eq("active", true);
  if (options.companyId) query = query.eq("company_id", options.companyId);
  const { data: policies, error } = await query;
  if (error) throw new Error(error.message);

  const outcomes: CategoryOutcome[] = [];
  const companies = new Set<string>();

  for (const p of policies ?? []) {
    companies.add(p.company_id);
    const cutoff = cutoffDate(p.retention_months).toISOString();
    const action = (p.purge_action as PurgeAction) ?? "anonymize";
    const handler = HANDLERS[p.category];
    const base = {
      companyId: p.company_id,
      category: p.category,
      retentionMonths: p.retention_months,
      cutoff,
      action,
      dryRun,
    };
    if (!handler) {
      outcomes.push({
        ...base,
        supported: false,
        reason: UNSUPPORTED[p.category] ?? "No purge handler registered for this category.",
        matched: 0,
        affected: 0,
      });
      continue;
    }
    try {
      const res = await handler(p.company_id, cutoff, action, dryRun);
      outcomes.push({ ...base, supported: true, ...res });
    } catch (e) {
      outcomes.push({
        ...base,
        supported: true,
        matched: 0,
        affected: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const report: PurgeReport = {
    ranAt: new Date().toISOString(),
    dryRun,
    companies: companies.size,
    policies: policies?.length ?? 0,
    matched: outcomes.reduce((s, o) => s + o.matched, 0),
    affected: outcomes.reduce((s, o) => s + o.affected, 0),
    outcomes,
  };

  // Append-only trail, one entry per company touched.
  for (const company of companies) {
    const scoped = outcomes.filter((o) => o.companyId === company);
    await supabaseAdmin.from("personal_data_access_log").insert({
      company_id: company,
      employee_id: null,
      actor_id: options.actorId ?? null,
      action: dryRun ? "retention_purge_preview" : "retention_purge",
      resource: "data_retention_policies",
      purpose: "legal_obligation",
      metadata: {
        source: options.source,
        ranAt: report.ranAt,
        legalBasis: "UU 27/2022 Pasal 16(1)f — retensi terbatas pada tujuan",
        outcomes: scoped.map((o) => ({
          category: o.category,
          action: o.action,
          cutoff: o.cutoff,
          matched: o.matched,
          affected: o.affected,
          supported: o.supported,
          error: o.error ?? null,
        })),
      },
    });
  }

  return report;
}
