import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ID_OBLIGATIONS, computeDueDate, periodLabel } from "./obligations.catalog";

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
    const rows: {
      company_id: string;
      country_code: string;
      code: string;
      name: string;
      category: string;
      frequency: string;
      base_legal: string | null;
      due_date: string;
      period_label: string;
      status: string;
      notes: string | null;
    }[] = [];

    for (const tpl of ID_OBLIGATIONS) {
      if (tpl.frequency === "monthly") {
        for (let m = 1; m <= 12; m++) {
          rows.push(makeRow(data.companyId, tpl, data.year, m));
        }
      } else if (tpl.frequency === "quarterly") {
        for (const m of [3, 6, 9, 12]) {
          rows.push(makeRow(data.companyId, tpl, data.year, m));
        }
      } else if (tpl.frequency === "annual") {
        rows.push(makeRow(data.companyId, tpl, data.year, tpl.annualMonth ?? 1));
      }
    }

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
    return { inserted: fresh.length, skipped: rows.length - fresh.length };
  });

function makeRow(
  companyId: string,
  tpl: (typeof ID_OBLIGATIONS)[number],
  year: number,
  month: number,
) {
  const due = computeDueDate(tpl, year, month);
  return {
    company_id: companyId,
    country_code: "ID",
    code: tpl.code,
    name: tpl.name,
    category: tpl.category,
    frequency: tpl.frequency,
    base_legal: tpl.base_legal ?? null,
    due_date: due.toISOString().slice(0, 10),
    period_label: periodLabel(tpl, year, month),
    status: "pending",
    notes: tpl.notes ?? null,
  };
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
export function classifyRisk(dueISO: string, status: string): "overdue" | "critical" | "soon" | "upcoming" | "done" {
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
export function obligationFindings(rows: { id: string; name: string; due_date: string; status: string; code: string }[]) {
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
      ? `${overdue.length} obligation(s) past due: ${overdue.slice(0, 3).map((o) => o.name).join(", ")}${overdue.length > 3 ? "…" : ""}`
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
