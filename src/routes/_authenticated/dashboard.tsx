import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Users, Wallet, ArrowRight, CalendarClock } from "lucide-react";
import { listEmployees, listPayrollRuns } from "@/lib/data.functions";
import { listObligations, obligationFindings, classifyRisk } from "@/lib/calendar.functions";
import { listContracts } from "@/lib/contracts.functions";
import { evaluateContracts, type ContractLike } from "@/lib/engines/contracts";
import { useCompany } from "@/lib/companyContext";
import { useActivePack } from "@/lib/packs/useActivePack";
import { evaluateCompany, scoreFindings, type Finding } from "@/lib/engines/compliance";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { company, companyId } = useCompany();
  const fetchEmployees = useServerFn(listEmployees);
  const fetchRuns = useServerFn(listPayrollRuns);
  const fetchObligations = useServerFn(listObligations);
  const fetchContracts = useServerFn(listContracts);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["runs", companyId],
    queryFn: () => fetchRuns({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });
  const { data: obligations = [] } = useQuery({
    queryKey: ["obligations", companyId],
    queryFn: () => fetchObligations({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", companyId],
    queryFn: () => fetchContracts({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  if (!companyId) {
    return <EmptyCompany />;
  }

  const report = evaluateCompany(employees as never[]);
  const calFindings = obligationFindings(obligations);
  const contractFindings = evaluateContracts(
    contracts as ContractLike[],
    (employees as { id: string; full_name: string }[]).map((e) => ({ id: e.id, full_name: e.full_name })),
  );
  const combined = [...report.findings, ...calFindings, ...contractFindings];
  const combinedScore = employees.length || obligations.length || contracts.length ? scoreFindings(combined) : 100;
  const failing = combined.filter((f) => !f.passed);
  const critical = failing.filter((f) => f.severity === "critical" || f.severity === "high");
  const atRiskCount = obligations.filter((o) => {
    const c = classifyRisk(o.due_date, o.status);
    return c === "overdue" || c === "critical";
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{company?.name ?? "Dashboard"}</h1>
        <p className="text-muted-foreground">Compliance overview · {activePack.name} Country Pack</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Compliance Score</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ScoreGauge score={combinedScore} label="Audit readiness" />
            <p className="text-center text-sm text-muted-foreground">
              {employees.length === 0 && obligations.length === 0
                ? "Add employees and seed the regulatory calendar to compute your score."
                : critical.length
                  ? `${critical.length} high-risk issue(s) — audit exposure.`
                  : "No critical exposure detected."}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat icon={Users} label="Employees" value={String(employees.length)} />
            <Stat icon={Wallet} label="Payroll runs" value={String(runs.length)} />
            <Stat icon={CalendarClock} label="At-risk filings" value={String(atRiskCount)} tone={atRiskCount ? "warn" : "ok"} />
            <Stat icon={AlertTriangle} label="Open findings" value={String(failing.length)} tone={failing.length ? "warn" : "ok"} />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Compliance findings</CardTitle>
              <Button asChild size="sm" variant="outline"><Link to="/payroll">Run payroll <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {failing.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Everything checks out.
                </div>
              ) : (
                dedupe(failing).slice(0, 8).map((f) => (
                  <div key={f.rule_code} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{f.title}</span>
                        <SeverityBadge s={f.severity} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{f.message}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{f.rule_code}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of findings) if (!seen.has(f.rule_code)) seen.set(f.rule_code, f);
  return [...seen.values()].sort((a, b) => b.weight - a.weight);
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={"flex h-10 w-10 items-center justify-center rounded-lg " + (tone === "warn" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="font-display text-xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ s }: { s: Finding["severity"] }) {
  const map: Record<string, string> = {
    critical: "bg-destructive/15 text-destructive",
    high: "bg-warning/15 text-warning",
    medium: "bg-accent/15 text-accent",
    info: "bg-muted text-muted-foreground",
  };
  return <Badge className={"border-0 " + map[s]}>{s}</Badge>;
}

function EmptyCompany() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h2 className="text-xl font-semibold">Create your first company</h2>
      <p className="mt-2 text-muted-foreground">Use the <span className="font-medium">+</span> button in the top bar to add a company, then start adding employees.</p>
    </div>
  );
}
