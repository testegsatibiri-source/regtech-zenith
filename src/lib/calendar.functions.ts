import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";

export const listObligations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("compliance_obligations")
      .select("*")
      .eq("company_id", data.companyId)
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const seedObligations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        year: z.number().int().min(2024).max(2030),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // The regulatory calendar always comes from the Country Pack installed for
    // this company's jurisdiction — never from a hardcoded Indonesian catalog.
    const { data: company, error: cErr } = await context.supabase
      .from("companies")
      .select("country_code, legal_name, name, statutory_metadata")
      .eq("id", data.companyId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    const countryCode = (company?.country_code ?? "ID").toUpperCase();

    const pack = CountryRuntime.get(countryCode);
    const templates = pack.providers.calendar?.templates() ?? [];
    if (!templates.length) {
      throw new Error(`Country Pack ${countryCode} provides no regulatory calendar`);
    }

    // H21 Phase 3 — staggered statutory deadlines are resolved from the
    // employer registry (statutory_metadata + registered name).
    const subject = {
      statutoryMetadata: (company?.statutory_metadata ?? null) as Record<string, unknown> | null,
      legalName: company?.legal_name ?? company?.name ?? null,
    };

    const rows = templates.flatMap((tpl) =>
      tpl.occurrences(data.year, subject).map((occ) => ({
        company_id: data.companyId,
        country_code: countryCode,
        code: tpl.code,
        name: tpl.title,
        category: tpl.category,
        frequency: tpl.cadence,
        base_legal: tpl.legalBasis ?? null,
        due_date: occ.due_date,
        period_label: periodLabelFrom(tpl.cadence, occ.period_start),
        status: "pending",
        notes:
          [
            occ.rule,
            occ.statutory_date && occ.statutory_date !== occ.due_date
              ? `Statutory date ${occ.statutory_date} rolled to the next business day`
              : null,
            occ.resolution === "needs_review" ? `⚠ ${occ.reason ?? "Needs review"}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
      })),
    );

    // Fetch existing to avoid duplicates (code + due_date).
    const { data: existing } = await context.supabase
      .from("compliance_obligations")
      .select("code, due_date")
      .eq("company_id", data.companyId);
    const existingKeys = new Set((existing ?? []).map((e) => `${e.code}::${e.due_date}`));

    const fresh = rows.filter((r) => !existingKeys.has(`${r.code}::${r.due_date}`));
    if (fresh.length) {
      const { error } = await context.supabase.from("compliance_obligations").insert(fresh);
      if (error) throw new Error(error.message);
    }
    return { inserted: fresh.length, skipped: rows.length - fresh.length, countryCode };
  });

function periodLabelFrom(cadence: string, periodStart: string): string {
  const [y, m] = periodStart.split("-");
  if (cadence === "annual") return `FY ${y}`;
  if (cadence === "quarterly") {
    const q = Math.ceil(Number(m) / 3);
    return `Q${q} ${y}`;
  }
  return `${y}-${m}`;
}

export const updateObligationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "completed", "dismissed"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("compliance_obligations")
      .update({
        status: data.status,
        completed_at: data.status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Utility: classify due-date risk relative to today. */
export function classifyRisk(
  dueISO: string,
  status: string,
): "overdue" | "critical" | "soon" | "upcoming" | "done" {
  if (status === "completed") return "done";
  if (status === "dismissed") return "done";
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const due = new Date(dueISO);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 3) return "critical";
  if (days <= 14) return "soon";
  return "upcoming";
}

/** Build compliance findings from a list of obligation rows for the score. */
export function obligationFindings(
  rows: { id: string; name: string; due_date: string; status: string; code: string }[],
) {
  const overdue = rows.filter((r) => classifyRisk(r.due_date, r.status) === "overdue");
  const critical = rows.filter((r) => classifyRisk(r.due_date, r.status) === "critical");
  const findings = [] as {
    rule_code: string;
    title: string;
    severity: "critical" | "high" | "medium" | "info";
    passed: boolean;
    message: string;
    weight: number;
  }[];
  findings.push({
    rule_code: "ID-CAL-OVERDUE",
    title: "No overdue regulatory obligations",
    severity: "critical",
    passed: overdue.length === 0,
    weight: 30,
    message: overdue.length
      ? `${overdue.length} obligation(s) past due: ${overdue
          .slice(0, 3)
          .map((o) => o.name)
          .join(", ")}${overdue.length > 3 ? "…" : ""}`
      : "All obligations up to date.",
  });
  findings.push({
    rule_code: "ID-CAL-DUE-3D",
    title: "No obligation due within 3 days",
    severity: "high",
    passed: critical.length === 0,
    weight: 18,
    message: critical.length
      ? `${critical.length} obligation(s) due within 3 days.`
      : "No imminent filings.",
  });
  return findings;
}
