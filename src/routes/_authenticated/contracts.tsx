import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, FileSignature, AlertTriangle, CheckCircle2 } from "lucide-react";
import { listContracts, upsertContract, deleteContract } from "@/lib/contracts.functions";
import { listEmployees } from "@/lib/data.functions";
import { useCompany } from "@/lib/companyContext";
import { classifyContractRisk, evaluateContracts, type ContractLike, type ContractRisk } from "@/lib/engines/contracts";
import { scoreFindings } from "@/lib/engines/compliance";
import { ScoreGauge } from "@/components/ScoreGauge";
import { formatIDR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contracts")({
  component: Contracts,
});

type Contract = ContractLike & {
  id?: string;
  company_id: string;
  position?: string | null;
  notes?: string | null;
  version: number;
  clauses: Record<string, unknown>;
};

function blank(companyId: string): Contract {
  const today = new Date().toISOString().slice(0, 10);
  return {
    company_id: companyId,
    employee_id: null,
    contract_type: "PKWTT",
    status: "draft",
    position: "",
    base_salary: 0,
    start_date: today,
    end_date: null,
    probation_end_date: null,
    version: 1,
    clauses: {},
    notes: "",
  };
}

function Contracts() {
  const { companyId } = useCompany();
  const fetchContracts = useServerFn(listContracts);
  const fetchEmployees = useServerFn(listEmployees);
  const saveContract = useServerFn(upsertContract);
  const delContract = useServerFn(deleteContract);
  const qc = useQueryClient();

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", companyId],
    queryFn: () => fetchContracts({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Contract | null>(null);

  const report = useMemo(() => {
    const findings = evaluateContracts(
      contracts as ContractLike[],
      (employees as { id: string; full_name: string }[]).map((e) => ({ id: e.id, full_name: e.full_name })),
    );
    return { findings, score: findings.length ? scoreFindings(findings) : 100 };
  }, [contracts, employees]);

  if (!companyId) return <p className="text-muted-foreground">Create a company first.</p>;

  function edit(c?: Contract) {
    setDraft(c ? { ...c, clauses: { ...(c.clauses ?? {}) } } : blank(companyId!));
    setOpen(true);
  }

  async function save() {
    if (!draft) return;
    if (draft.contract_type === "PKWT" && !draft.end_date) return toast.error("PKWT requires an end date");
    try {
      await saveContract({ data: draft as never });
      toast.success("Contract saved");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["contracts", companyId] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(id: string) {
    await delContract({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["contracts", companyId] });
    toast.success("Deleted");
  }

  const emps = employees as { id: string; full_name: string; base_salary: number; position: string | null }[];
  const cs = contracts as (Contract & { id: string })[];

  const stats = {
    active: cs.filter((c) => c.status === "active").length,
    expiring: cs.filter((c) => ["critical", "soon"].includes(classifyContractRisk(c))).length,
    expired: cs.filter((c) => classifyContractRisk(c) === "expired").length,
    coverage: emps.length ? Math.round((cs.filter((c) => c.status === "active" && c.employee_id).length / emps.length) * 100) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employment Contracts</h1>
          <p className="text-muted-foreground">PKWT / PKWTT · PP 35/2021 · UU 13/2003 (Omnibus Law)</p>
        </div>
        <Button onClick={() => edit()}><Plus className="mr-1 h-4 w-4" /> New contract</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Contract compliance</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ScoreGauge score={report.score} label="Coverage & validity" />
            <p className="text-center text-sm text-muted-foreground">
              {report.findings.filter((f) => !f.passed).length
                ? `${report.findings.filter((f) => !f.passed).length} contractual issue(s) detected.`
                : "Contracts fully compliant."}
            </p>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <Stat icon={FileSignature} label="Active" value={String(stats.active)} tone="ok" />
          <Stat icon={CheckCircle2} label="Coverage" value={`${stats.coverage}%`} tone={stats.coverage < 100 ? "warn" : "ok"} />
          <Stat icon={AlertTriangle} label="Expiring ≤ 60d" value={String(stats.expiring)} tone={stats.expiring ? "warn" : "ok"} />
          <Stat icon={AlertTriangle} label="Expired" value={String(stats.expired)} tone={stats.expired ? "warn" : "ok"} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Base salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No contracts yet.</TableCell></TableRow>
              )}
              {cs.map((c) => {
                const emp = emps.find((e) => e.id === c.employee_id);
                const risk = classifyContractRisk(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{emp?.full_name ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell><Badge variant="outline">{c.contract_type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.start_date} → {c.end_date ?? "∞"}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatIDR(c.base_salary)}</TableCell>
                    <TableCell><StatusBadge s={c.status} /></TableCell>
                    <TableCell><RiskBadge r={risk} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => edit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => c.id && remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {report.findings.filter((f) => !f.passed).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Findings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {report.findings.filter((f) => !f.passed).map((f, i) => (
              <div key={`${f.rule_code}-${i}`} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{f.title}</span>
                    <Badge className={"border-0 " + (f.severity === "critical" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")}>{f.severity}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.message}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{f.rule_code}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit" : "New"} contract</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Employee" className="sm:col-span-2">
                <Select
                  value={draft.employee_id ?? "none"}
                  onValueChange={(v) => {
                    const emp = emps.find((e) => e.id === v);
                    setDraft({
                      ...draft,
                      employee_id: v === "none" ? null : v,
                      base_salary: emp && draft.base_salary === 0 ? emp.base_salary : draft.base_salary,
                      position: emp && !draft.position ? emp.position : draft.position,
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned (draft)</SelectItem>
                    {emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="Contract type">
                <Select value={draft.contract_type} onValueChange={(v) => setDraft({ ...draft, contract_type: v as "PKWT" | "PKWTT" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PKWTT">PKWTT (permanent)</SelectItem>
                    <SelectItem value="PKWT">PKWT (fixed-term)</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Status">
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as ContractLike["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Position"><Input value={draft.position ?? ""} onChange={(e) => setDraft({ ...draft, position: e.target.value })} /></F>
              <F label="Base salary (IDR)"><Input type="number" value={draft.base_salary} onChange={(e) => setDraft({ ...draft, base_salary: Number(e.target.value) })} /></F>
              <F label="Start date"><Input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} /></F>
              <F label={draft.contract_type === "PKWT" ? "End date (required)" : "End date (optional)"}>
                <Input type="date" value={draft.end_date ?? ""} onChange={(e) => setDraft({ ...draft, end_date: e.target.value || null })} />
              </F>
              <F label="Probation ends" className="sm:col-span-2">
                <Input type="date" value={draft.probation_end_date ?? ""} onChange={(e) => setDraft({ ...draft, probation_end_date: e.target.value || null })} />
                {draft.contract_type === "PKWT" && draft.probation_end_date && (
                  <p className="text-xs text-destructive">PKWT cannot include probation (UU 13/2003 art. 58).</p>
                )}
              </F>
              <F label="Notes / special clauses" className="sm:col-span-2">
                <Textarea rows={3} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </F>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof FileSignature; label: string; value: string; tone?: "ok" | "warn" }) {
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

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    active: "bg-success/15 text-success",
    draft: "bg-muted text-muted-foreground",
    expired: "bg-destructive/15 text-destructive",
    terminated: "bg-muted text-muted-foreground",
  };
  return <Badge className={"border-0 " + (map[s] ?? "")}>{s}</Badge>;
}

function RiskBadge({ r }: { r: ContractRisk }) {
  if (r === "n/a" || r === "ok") return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    expired: "bg-destructive/15 text-destructive",
    critical: "bg-destructive/15 text-destructive",
    soon: "bg-warning/15 text-warning",
  };
  return <Badge className={"border-0 " + (map[r] ?? "")}>{r}</Badge>;
}

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={"space-y-1.5 " + (className ?? "")}><Label>{label}</Label>{children}</div>;
}
