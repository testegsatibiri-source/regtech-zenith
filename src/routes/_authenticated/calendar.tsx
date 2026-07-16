import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, AlertTriangle, CheckCircle2, Clock, Sparkles, Loader2, Filter } from "lucide-react";
import {
  listObligations,
  seedObligations,
  updateObligationStatus,
  classifyRisk,
} from "@/lib/calendar.functions";
import { useCompany } from "@/lib/companyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type Obligation = Awaited<ReturnType<typeof listObligations>>[number];

const CATEGORY_LABEL: Record<string, string> = {
  tax: "Tax (DJP)",
  bpjs: "BPJS",
  labor: "Labor (Kemnaker)",
  other: "Other",
};

const RISK_STYLE: Record<ReturnType<typeof classifyRisk>, string> = {
  overdue: "bg-destructive/15 text-destructive border-destructive/40",
  critical: "bg-warning/15 text-warning border-warning/40",
  soon: "bg-accent/15 text-accent border-accent/40",
  upcoming: "bg-muted text-muted-foreground border-border",
  done: "bg-success/15 text-success border-success/40",
};

const RISK_LABEL: Record<ReturnType<typeof classifyRisk>, string> = {
  overdue: "Overdue",
  critical: "Due ≤ 3 days",
  soon: "Due ≤ 14 days",
  upcoming: "Upcoming",
  done: "Done",
};

function CalendarPage() {
  const { companyId } = useCompany();
  const list = useServerFn(listObligations);
  const seed = useServerFn(seedObligations);
  const update = useServerFn(updateObligationStatus);

  const [rows, setRows] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [year] = useState<number>(new Date().getUTCFullYear());

  async function refresh() {
    if (!companyId) return;
    setLoading(true);
    try {
      setRows(await list({ data: { companyId } }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [companyId]);

  async function handleSeed() {
    if (!companyId) return;
    setSeeding(true);
    try {
      const r = await seed({ data: { companyId, year } });
      toast.success(`Seeded ${r.inserted} obligation(s) for ${year}${r.skipped ? ` (${r.skipped} already present)` : ""}`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  async function setStatus(id: string, status: "pending" | "completed" | "dismissed") {
    try {
      await update({ data: { id, status } });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, completed_at: status === "completed" ? new Date().toISOString() : null } : r)));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const stats = useMemo(() => {
    const s = { overdue: 0, critical: 0, soon: 0, upcoming: 0, done: 0 };
    for (const r of rows) s[classifyRisk(r.due_date, r.status)]++;
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "open") return rows.filter((r) => r.status === "pending");
    if (filter === "at_risk")
      return rows.filter((r) => {
        const c = classifyRisk(r.due_date, r.status);
        return c === "overdue" || c === "critical" || c === "soon";
      });
    return rows.filter((r) => r.category === filter);
  }, [rows, filter]);

  if (!companyId) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="text-xl font-semibold">Select a company</h2>
        <p className="mt-2 text-muted-foreground">Pick a company in the top bar to view its regulatory calendar.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
            <CalendarClock className="h-8 w-8 text-primary" /> Regulatory Calendar
          </h1>
          <p className="mt-1 text-muted-foreground">
            Indonesian tax, BPJS and labor obligations — driven by the Country Pack.
          </p>
        </div>
        <Button onClick={handleSeed} disabled={seeding}>
          {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Seed {year} obligations
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <StatCard label="Overdue" value={stats.overdue} tone="destructive" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="≤ 3 days" value={stats.critical} tone="warning" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="≤ 14 days" value={stats.soon} tone="accent" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Upcoming" value={stats.upcoming} tone="muted" icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="Completed" value={stats.done} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Obligations</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="at_risk">At risk</SelectItem>
                <SelectItem value="open">Open (pending)</SelectItem>
                <SelectItem value="tax">Tax</SelectItem>
                <SelectItem value="bpjs">BPJS</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No obligations yet. Click <strong>Seed {year} obligations</strong> to bootstrap the Indonesia calendar.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => {
                const risk = classifyRisk(r.due_date, r.status);
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-28 text-sm font-medium tabular-nums">
                      {new Date(r.due_date).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{r.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{CATEGORY_LABEL[r.category] ?? r.category}</span>
                        <span>·</span>
                        <span>{r.period_label}</span>
                        {r.base_legal && <><span>·</span><span className="truncate">{r.base_legal}</span></>}
                      </div>
                    </div>
                    <Badge variant="outline" className={RISK_STYLE[risk]}>{RISK_LABEL[risk]}</Badge>
                    <div className="flex gap-1">
                      {r.status !== "completed" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "completed")}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark done
                        </Button>
                      )}
                      {r.status === "completed" && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "pending")}>
                          Reopen
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  const toneMap: Record<string, string> = {
    destructive: "text-destructive",
    warning: "text-warning",
    accent: "text-accent",
    muted: "text-muted-foreground",
    success: "text-success",
  };
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`mt-1 text-2xl font-bold tabular-nums ${toneMap[tone]}`}>{value}</div>
        </div>
        <div className={toneMap[tone]}>{icon}</div>
      </CardContent>
    </Card>
  );
}
