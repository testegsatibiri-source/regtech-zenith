import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, ShieldAlert, ShieldCheck, TrendingUp, AlertTriangle, Loader2, FileText } from "lucide-react";
import { runComplianceAudit, type AuditReport, type AuditInsight } from "@/lib/audit.functions";
import { useCompany } from "@/lib/companyContext";
import { useActivePack } from "@/lib/packs/useActivePack";
import { formatIDR } from "@/lib/format";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditPage,
});

const SEV_STYLE: Record<AuditInsight["severity"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  info: "bg-muted text-muted-foreground border-border",
};

const RISK_STYLE: Record<AuditReport["riskLevel"], string> = {
  low: "text-success",
  moderate: "text-accent",
  high: "text-warning",
  severe: "text-destructive",
};

function AuditPage() {
  const { company, companyId } = useCompany();
  const activePack = useActivePack();
  const run = useServerFn(runComplianceAudit);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);

  async function trigger() {
    if (!companyId) return;
    setLoading(true);
    try {
      const r = await run({ data: { companyId } });
      setReport(r);
      toast.success(`Audit complete — ${r.insights.length} insight(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!companyId) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="text-xl font-semibold">Select a company</h2>
        <p className="mt-2 text-muted-foreground">Create or pick a company in the top bar to run an audit.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-bold">Predictive Compliance Audit</h1>
          </div>
          <p className="text-muted-foreground">
            {company?.name} · Statistical + rule-based anomaly detection with AI narrative
          </p>
        </div>
        <Button onClick={trigger} disabled={loading} size="lg">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Auditing…</> : <><ShieldAlert className="mr-2 h-4 w-4" /> Run audit</>}
        </Button>
      </div>

      {!report && !loading && <EmptyState />}
      {loading && (
        <Card><CardContent className="flex items-center gap-3 p-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Cross-checking employees, latest payroll run and Country Pack rules…
        </CardContent></Card>
      )}

      {report && (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle>Overall risk</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <ScoreGauge score={report.complianceScore} label="Audit readiness" />
                <div className={"text-sm font-medium uppercase tracking-wide " + RISK_STYLE[report.riskLevel]}>
                  {report.riskLevel} risk
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {report.insights.length} insight(s) across {report.employeeCount} employee(s)
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4 lg:col-span-2">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat icon={AlertTriangle} tone="warn" value={report.stats.belowUmp} label="Below UMP" />
                <Stat icon={AlertTriangle} tone="warn" value={report.stats.overtimeViolations} label="OT violations" />
                <Stat icon={TrendingUp} value={report.stats.salaryOutliers} label="Salary outliers" />
                <Stat icon={FileText} value={report.stats.missingNpwp} label="Missing NPWP" />
                <Stat icon={ShieldAlert} value={report.stats.missingBpjs} label="Missing BPJS" />
                <Stat icon={ShieldCheck} value={report.stats.payrollPeriod ?? "—"} label="Last run" />
              </div>

              <Card>
                <CardHeader className="flex-row items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <CardTitle>AI executive summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {report.narrative}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>Total gross: <strong className="text-foreground">{formatIDR(report.stats.totalGross)}</strong></span>
                    <span>Avg salary: <strong className="text-foreground">{formatIDR(report.stats.avgSalary)}</strong></span>
                    <span>Median: <strong className="text-foreground">{formatIDR(report.stats.medianSalary)}</strong></span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Findings ({report.insights.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {report.insights.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                  <ShieldCheck className="h-4 w-4" /> No anomalies detected.
                </div>
              ) : (
                report.insights.map((i) => (
                  <div key={i.code} className={"rounded-lg border p-4 " + SEV_STYLE[i.severity]}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-current bg-transparent uppercase">{i.severity}</Badge>
                      <Badge variant="outline" className="border-current bg-transparent">{i.category}</Badge>
                      <span className="font-semibold">{i.title}</span>
                      <span className="ml-auto font-mono text-xs opacity-70">{i.code}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/90">{i.message}</p>
                    {i.evidence && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Evidence:</span> {i.evidence}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Generated {new Date(report.generatedAt).toLocaleString()} · {activePack.name} Country Pack {activePack.rulesetVersion ?? ""}
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label, tone }: { icon: typeof ShieldAlert; value: string | number; label: string; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={"flex h-10 w-10 items-center justify-center rounded-lg " + (tone === "warn" && value !== 0 ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="font-display text-lg font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  const activePack = useActivePack();
  return (
    <Card><CardContent className="space-y-3 p-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-accent" />
      <h3 className="text-lg font-semibold">Run a predictive audit</h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        UBoard Asia will cross-check every employee against the {activePack.name} Country Pack rules (wage floors, tax IDs, statutory contributions, working-time and bonus liabilities),
        detect statistical outliers in salaries and effective tax rates, and generate an executive summary powered by AI.
      </p>
    </CardContent></Card>
  );
}
