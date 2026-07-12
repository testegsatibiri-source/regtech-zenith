import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, History } from "lucide-react";
import { listEmployees, savePayrollRun, listPayrollRuns } from "@/lib/data.functions";
import { useCompany } from "@/lib/companyContext";
import { buildPayslip } from "@/lib/engines/indonesia";
import { evaluateCompany } from "@/lib/engines/compliance";
import { formatIDR } from "@/lib/format";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: Payroll,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Emp = {
  id: string; full_name: string; base_salary: number; marital_status: string;
  country_metadata?: Record<string, unknown> | null;
};

function Payroll() {
  const { company, companyId } = useCompany();
  const fetchEmployees = useServerFn(listEmployees);
  const saveRun = useServerFn(savePayrollRun);
  const fetchRuns = useServerFn(listPayrollRuns);
  const queryClient = useQueryClient();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [saving, setSaving] = useState(false);

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

  const computed = useMemo(() => {
    return (employees as Emp[]).map((e) => {
      const hasNpwp = Boolean(e.country_metadata?.npwp);
      const slip = buildPayslip({ baseSalary: e.base_salary, maritalStatus: e.marital_status, hasNpwp });
      return { emp: e, slip };
    });
  }, [employees]);

  const totals = computed.reduce(
    (a, { slip }) => ({
      gross: a.gross + slip.gross,
      tax: a.tax + slip.tax.tax,
      bpjsEmp: a.bpjsEmp + slip.bpjs.employee.total,
      net: a.net + slip.net,
      cost: a.cost + slip.employerCost,
    }),
    { gross: 0, tax: 0, bpjsEmp: 0, net: 0, cost: 0 },
  );

  const score = employees.length ? evaluateCompany(employees as never[]).score : 100;

  if (!companyId) return <p className="text-muted-foreground">Create a company first.</p>;

  async function run() {
    if (!computed.length) return toast.error("No employees to process");
    setSaving(true);
    try {
      await saveRun({
        data: {
          company_id: companyId!,
          period_month: month,
          period_year: year,
          country_code: "ID",
          compliance_score: score,
          totals,
          items: computed.map(({ emp, slip }) => ({
            employee_id: emp.id,
            employee_name: emp.full_name,
            gross: slip.gross,
            tax: slip.tax.tax,
            bpjs_employee: slip.bpjs.employee.total,
            bpjs_employer: slip.bpjs.employer.total,
            net: slip.net,
            breakdown: { terCategory: slip.tax.category, terRate: slip.tax.rate },
          })),
        } as never,
      });
      toast.success(`Payroll finalized — Compliance Score ${score}%`);
      await queryClient.invalidateQueries({ queryKey: ["runs", companyId] });
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">{company?.name} · close the month and lock in the Compliance Score</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-28">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={run} disabled={saving}><Play className="mr-1 h-4 w-4" /> Run payroll</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        <Card className="flex flex-col items-center justify-center gap-2 py-6">
          <ScoreGauge score={score} size={120} label="Compliance" />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-2">
          <Metric label="Total gross" value={formatIDR(totals.gross)} />
          <Metric label="PPh 21 withheld" value={formatIDR(totals.tax)} />
          <Metric label="Net take-home" value={formatIDR(totals.net)} tone="net" />
          <Metric label="Total employer cost" value={formatIDR(totals.cost)} tone="cost" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Preview · {MONTHS[month - 1]} {year}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>TER</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">PPh 21</TableHead>
                <TableHead className="text-right">BPJS</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computed.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Add employees to run payroll.</TableCell></TableRow>
              )}
              {computed.map(({ emp, slip }) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell><Badge variant="secondary">{slip.tax.category} · {(slip.tax.rate * 100).toFixed(2)}%</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(slip.gross)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(slip.tax.tax)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(slip.bpjs.employee.total)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-success">{formatIDR(slip.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Payroll history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Net total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No runs yet.</TableCell></TableRow>
              )}
              {(runs as { id: string; period_month: number; period_year: number; compliance_score: number; status: string; totals: { net?: number } }[]).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{MONTHS[r.period_month - 1]} {r.period_year}</TableCell>
                  <TableCell><Badge className={"border-0 " + (r.compliance_score >= 85 ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>{r.compliance_score}%</Badge></TableCell>
                  <TableCell className="capitalize text-muted-foreground">{r.status}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totals?.net != null ? formatIDR(r.totals.net) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "net" | "cost" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={"mt-1 font-display text-xl font-bold " + (tone === "net" ? "text-success" : tone === "cost" ? "text-primary" : "")}>{value}</div>
      </CardContent>
    </Card>
  );
}
