// Predictive Compliance Audit — statistical + rules-based anomaly detection
// over the company's employees and most recent payroll run, enhanced with
// a Lovable AI narrative summary. Fase 4 of the UBoard Asia roadmap.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";
import type { IndonesiaParams } from "./countryPacks";
import { evaluateCompany, type Finding } from "./engines/compliance";
import type { CountryCode } from "./engines/types";

export type AuditSeverity = "critical" | "high" | "medium" | "info";

export interface AuditInsight {
  code: string;
  title: string;
  severity: AuditSeverity;
  category: "labour" | "tax" | "bpjs" | "payroll" | "thr" | "data";
  message: string;
  evidence?: string;
  affected?: number;
}

export interface AuditReport {
  generatedAt: string;
  companyId: string;
  employeeCount: number;
  complianceScore: number;
  riskLevel: "low" | "moderate" | "high" | "severe";
  insights: AuditInsight[];
  stats: {
    totalGross: number;
    avgSalary: number;
    medianSalary: number;
    payrollPeriod: string | null;
    belowUmp: number;
    missingNpwp: number;
    missingBpjs: number;
    overtimeViolations: number;
    salaryOutliers: number;
  };
  narrative: string;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function stddev(nums: number[], mean: number): number {
  if (nums.length < 2) return 0;
  const v = nums.reduce((a, n) => a + (n - mean) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

const JURISDICTIONS: Record<string, { name: string; authorities: string; regs: string }> = {
  ID: { name: "Indonesian", authorities: "Kemenaker + DJP", regs: "Omnibus Law, PP 58/2023, BPJS" },
  PH: {
    name: "Philippine",
    authorities: "DOLE + BIR",
    regs: "Labor Code, TRAIN Law, SSS/PhilHealth/Pag-IBIG",
  },
  MY: { name: "Malaysian", authorities: "LHDN + KWSP", regs: "Employment Act, EPF, SOCSO" },
};

async function generateNarrative(
  report: Omit<AuditReport, "narrative">,
  countryCode: string,
  currency: string,
): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return "AI narrative unavailable (LOVABLE_API_KEY missing). Review insights below for details.";
  }
  const j = JURISDICTIONS[countryCode] ?? {
    name: countryCode,
    authorities: "local regulators",
    regs: "local labour and tax law",
  };
  const topInsights = report.insights
    .filter((i) => i.severity === "critical" || i.severity === "high")
    .slice(0, 8)
    .map((i) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.message}`)
    .join("\n");

  const prompt = `You are a senior ${j.name} payroll compliance auditor (${j.authorities}).
Write a concise executive audit summary (max 180 words) for a CFO.
Use plain language, name specific regulations (${j.regs}),
quantify risk in ${currency} where possible, and end with the top 3 recommended actions.

Company snapshot:
- Jurisdiction: ${countryCode}
- Employees: ${report.employeeCount}
- Compliance Score: ${report.complianceScore}/100 (${report.riskLevel} risk)
- Payroll period: ${report.stats.payrollPeriod ?? "not yet processed"}
- Total gross monthly payroll: ${currency} ${report.stats.totalGross.toLocaleString("en-US")}
- Below minimum wage: ${report.stats.belowUmp} employees
- Missing tax ID: ${report.stats.missingNpwp}
- Missing statutory enrolment: ${report.stats.missingBpjs}
- Overtime limit violations: ${report.stats.overtimeViolations}
- Salary statistical outliers (>2σ): ${report.stats.salaryOutliers}

Top findings:
${topInsights || "No critical or high-severity findings."}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a precise, non-alarmist ${j.name} payroll compliance auditor.`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return `AI narrative unavailable (gateway ${res.status}). ${text.slice(0, 140)}`;
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() ?? "AI narrative returned empty.";
  } catch (e) {
    return `AI narrative unavailable (${(e as Error).message}).`;
  }
}

export const runComplianceAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<AuditReport> => {
    const { companyId } = data;

    const [
      { data: company, error: cErr },
      { data: employees, error: eErr },
      { data: latestRun, error: rErr },
    ] = await Promise.all([
      context.supabase
        .from("companies")
        .select("country_code, currency")
        .eq("id", companyId)
        .maybeSingle(),
      context.supabase.from("employees").select("*").eq("company_id", companyId),
      context.supabase
        .from("payroll_runs")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (cErr) throw new Error(cErr.message);
    if (eErr) throw new Error(eErr.message);
    if (rErr) throw new Error(rErr.message);

    // The audit always runs against the jurisdiction of the company, never a
    // hardcoded pack (audit finding #2 — Indonesia leak).
    const countryCode = (company?.country_code ?? "ID").toUpperCase();
    const currency = company?.currency ?? "IDR";
    const isID = countryCode === "ID";

    const emps = employees ?? [];
    let items: {
      employee_id: string | null;
      employee_name: string;
      gross: number;
      tax: number;
      bpjs_employee: number;
      bpjs_employer: number;
      net: number;
      breakdown: Record<string, unknown>;
    }[] = [];
    if (latestRun) {
      const { data: it, error: iErr } = await context.supabase
        .from("payroll_items")
        .select("*")
        .eq("run_id", latestRun.id);
      if (iErr) throw new Error(iErr.message);
      items = (it ?? []) as typeof items;
    }

    // Base compliance report (rule-based findings, per-employee)
    const compliance = evaluateCompany(emps as never[], countryCode as CountryCode);

    const salaries = emps.map((e) => Number(e.base_salary ?? 0)).filter((n) => n > 0);
    const totalGross =
      items.reduce((a, i) => a + Number(i.gross ?? 0), 0) || salaries.reduce((a, n) => a + n, 0);
    const avgSalary = salaries.length
      ? Math.round(salaries.reduce((a, n) => a + n, 0) / salaries.length)
      : 0;
    const sd = stddev(salaries, avgSalary);
    const insights: AuditInsight[] = [];

    // ---- Jurisdiction-specific heuristics ----
    // Indonesia-only signals (UMP / NPWP / BPJS / Omnibus overtime). Other
    // jurisdictions contribute through their own pack audit provider below.
    const pack = CountryRuntime.get(countryCode);
    const params = isID ? (pack.params as unknown as IndonesiaParams) : null;
    const umpJakarta = params?.minimumWage["DKI Jakarta"] ?? 0;
    const belowUmp = params ? emps.filter((e) => Number(e.base_salary) < umpJakarta) : [];
    if (belowUmp.length) {
      insights.push({
        code: "AI-UMP-01",
        title: "Salaries below regional minimum wage",
        severity: "critical",
        category: "labour",
        message: `${belowUmp.length} employee(s) earn less than DKI Jakarta UMP (IDR ${umpJakarta.toLocaleString("id-ID")}). Each violation exposes the employer to fines from Kemenaker (Law 13/2003 art. 90).`,
        evidence: belowUmp
          .slice(0, 5)
          .map((e) => `${e.full_name}: IDR ${Number(e.base_salary).toLocaleString("id-ID")}`)
          .join("; "),
        affected: belowUmp.length,
      });
    }

    // ---- Missing NPWP ----
    const missingNpwp = isID
      ? emps.filter((e) => !(e.country_metadata as Record<string, unknown> | null)?.npwp)
      : [];
    if (missingNpwp.length) {
      const extraTax = missingNpwp.reduce((a, e) => {
        const rate = 0.05; // rough average TER
        return a + Math.round(Number(e.base_salary) * rate * 0.2);
      }, 0);
      insights.push({
        code: "AI-TAX-02",
        title: "Missing NPWP triggers 20% surcharge",
        severity: "high",
        category: "tax",
        message: `${missingNpwp.length} employee(s) without NPWP. Estimated extra PPh 21 withholding: IDR ${extraTax.toLocaleString("id-ID")}/month. DJP surcharge applies until NPWP is registered.`,
        affected: missingNpwp.length,
      });
    }

    // ---- BPJS enrolment ----
    const missingBpjs = isID
      ? emps.filter((e) => {
          const m = (e.country_metadata as Record<string, unknown> | null) ?? {};
          return !m.bpjs_kesehatan || !m.bpjs_ketenagakerjaan;
        })
      : [];
    if (missingBpjs.length) {
      insights.push({
        code: "AI-BPJS-03",
        title: "BPJS enrolment gaps",
        severity: "high",
        category: "bpjs",
        message: `${missingBpjs.length} employee(s) not enrolled in BPJS Kesehatan and/or Ketenagakerjaan. Mandatory under Perpres 82/2018 and UU 24/2011 — administrative sanctions and service suspension apply.`,
        affected: missingBpjs.length,
      });
    }

    // ---- Overtime (Omnibus Law) ----
    const otViolations = params
      ? emps.filter((e) => {
          const h = Number(
            (e.country_metadata as Record<string, unknown> | null)?.weekly_overtime_hours ?? 0,
          );
          return h > params.overtime.maxPerWeek;
        })
      : [];
    if (otViolations.length) {
      const dept = otViolations.reduce<Record<string, number>>((a, e) => {
        const d = String(e.department ?? "Unassigned");
        a[d] = (a[d] ?? 0) + 1;
        return a;
      }, {});
      const worst = Object.entries(dept).sort((a, b) => b[1] - a[1])[0];
      const pct = Math.round((otViolations.length / Math.max(1, emps.length)) * 100);
      insights.push({
        code: "AI-OT-04",
        title: "Overtime exceeds Omnibus Law limits",
        severity: "high",
        category: "labour",
        message: `${otViolations.length} employee(s) (${pct}%) exceed the 18h/week overtime cap (PP 35/2021, Omnibus Law). Concentration in "${worst?.[0]}": ${worst?.[1]} case(s). Labour dispute risk is elevated.`,
        affected: otViolations.length,
      });
    }

    // ---- Salary outliers (>2σ from mean) ----
    const money = (n: number) => `${currency} ${Math.round(n).toLocaleString("en-US")}`;
    const outliers =
      sd > 0 ? emps.filter((e) => Math.abs(Number(e.base_salary) - avgSalary) > 2 * sd) : [];
    if (outliers.length) {
      insights.push({
        code: "AI-STAT-05",
        title: "Statistical salary anomalies",
        severity: "medium",
        category: "payroll",
        message: `${outliers.length} salary value(s) sit more than 2σ from the company mean (${money(avgSalary)}). Verify data-entry errors or unauthorised adjustments before running payroll.`,
        evidence: outliers
          .slice(0, 5)
          .map((e) => `${e.full_name}: ${money(Number(e.base_salary))}`)
          .join("; "),
        affected: outliers.length,
      });
    }

    // ---- THR readiness (Muslim employees vs Eid) — Indonesia only ----
    const muslim = isID ? emps.filter((e) => (e.religion ?? "").toLowerCase() === "islam") : [];
    if (muslim.length) {
      insights.push({
        code: "AI-THR-06",
        title: "THR (Tunjangan Hari Raya) exposure",
        severity: "info",
        category: "thr",
        message: `${muslim.length} Muslim employee(s) are entitled to THR before Eid al-Fitr. Estimated one-month THR liability: IDR ${muslim.reduce((a, e) => a + Number(e.base_salary), 0).toLocaleString("id-ID")}. Payment must occur no later than 7 days before the holiday (Permenaker 6/2016).`,
        affected: muslim.length,
      });
    }

    // ---- Country Pack audit heuristics (all jurisdictions) ----
    for (const h of pack.providers.audit?.heuristics() ?? []) {
      const outcome = h.evaluate({
        employees: emps as unknown as Array<Record<string, unknown>>,
        params: pack.params as unknown as Record<string, unknown>,
      });
      if (outcome.passed) continue; // only failing controls become insights
      insights.push({
        code: h.code,
        title: h.title,
        severity: h.severity,
        category: "labour",
        message: outcome.message,
      });
    }

    // ---- Tax anomalies in latest run ----
    if (items.length) {
      const effRates = items
        .filter((i) => Number(i.gross) > 0)
        .map((i) => Number(i.tax) / Number(i.gross));
      const avgRate = effRates.reduce((a, n) => a + n, 0) / Math.max(1, effRates.length);
      const spikes = items.filter(
        (i) => Number(i.gross) > 0 && Number(i.tax) / Number(i.gross) > avgRate * 2 && avgRate > 0,
      );
      if (spikes.length) {
        insights.push({
          code: "AI-TAX-07",
          title: "PPh 21 effective-rate spikes",
          severity: "medium",
          category: "tax",
          message: `${spikes.length} payslip(s) in the latest run show an effective tax rate above 2× company average (${(avgRate * 100).toFixed(2)}%). Cross-check TER category and NPWP status.`,
          affected: spikes.length,
        });
      }
    } else {
      insights.push({
        code: "AI-RUN-08",
        title: "No payroll run available",
        severity: "info",
        category: "payroll",
        message:
          "Process at least one payroll month to unlock statistical audit of tax and BPJS distributions.",
      });
    }

    // ---- Merge with rule-based findings (unique failing ones) ----
    const seen = new Set(insights.map((i) => i.code));
    const failing = compliance.findings.filter((f: Finding) => !f.passed);
    for (const f of failing) {
      if (seen.has(f.rule_code)) continue;
      insights.push({
        code: f.rule_code,
        title: f.title,
        severity: f.severity,
        category: "data",
        message: f.message,
      });
      seen.add(f.rule_code);
    }

    const score = emps.length ? compliance.score : 100;
    const riskLevel: AuditReport["riskLevel"] =
      score >= 90 ? "low" : score >= 75 ? "moderate" : score >= 55 ? "high" : "severe";

    const base: Omit<AuditReport, "narrative"> = {
      generatedAt: new Date().toISOString(),
      companyId,
      employeeCount: emps.length,
      complianceScore: score,
      riskLevel,
      insights: insights.sort((a, b) => {
        const w = { critical: 4, high: 3, medium: 2, info: 1 };
        return w[b.severity] - w[a.severity];
      }),
      stats: {
        totalGross,
        avgSalary,
        medianSalary: median(salaries),
        payrollPeriod: latestRun
          ? `${latestRun.period_year}-${String(latestRun.period_month).padStart(2, "0")}`
          : null,
        belowUmp: belowUmp.length,
        missingNpwp: missingNpwp.length,
        missingBpjs: missingBpjs.length,
        overtimeViolations: otViolations.length,
        salaryOutliers: outliers.length,
      },
    };

    const narrative = await generateNarrative(base, countryCode, currency);
    return { ...base, narrative };
  });
