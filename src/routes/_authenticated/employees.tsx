import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Pencil, CheckCircle2, XCircle, Eye } from "lucide-react";
import {
  listEmployees,
  upsertEmployee,
  deleteEmployee,
  revealEmployeeField,
} from "@/lib/data.functions";
import { sensitiveFieldSpec } from "@/lib/privacy/sensitive-fields";
import { useCompany } from "@/lib/companyContext";
import { useActivePack } from "@/lib/packs/useActivePack";
import { MARITAL_STATUS, RELIGIONS } from "@/lib/countryPacks";
import { evaluateEmployee, scoreFindings } from "@/lib/engines/compliance";
import { formatCurrency } from "@/lib/format";
import { terminologyFor } from "@/lib/packs/terminology";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/employees")({
  component: Employees,
});

type Emp = {
  id?: string;
  company_id: string;
  full_name: string;
  position?: string | null;
  department?: string | null;
  base_salary: number;
  marital_status: string;
  religion?: string | null;
  country_metadata: Record<string, unknown>;
};

function blank(companyId: string): Emp {
  return {
    company_id: companyId,
    full_name: "",
    position: "",
    department: "",
    base_salary: 5000000,
    marital_status: "TK/0",
    religion: "Islam",
    country_metadata: { nik: "", npwp: "", bpjs_kesehatan: "", bpjs_ketenagakerjaan: "" },
  };
}

function Employees() {
  const { companyId } = useCompany();
  const activePack = useActivePack();
  const t = terminologyFor(activePack.code);
  const money = (v: number) => formatCurrency(v, activePack.currency);
  const fetchEmployees = useServerFn(listEmployees);
  const saveEmp = useServerFn(upsertEmployee);
  const delEmp = useServerFn(deleteEmployee);
  const revealFn = useServerFn(revealEmployeeField);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Emp | null>(null);

  if (!companyId) return <p className="text-muted-foreground">Create a company first.</p>;

  function edit(e?: Emp) {
    setDraft(e ? { ...e, country_metadata: { ...(e.country_metadata ?? {}) } } : blank(companyId!));
    setOpen(true);
  }

  async function save() {
    if (!draft || !draft.full_name.trim()) return toast.error("Name is required");
    try {
      await saveEmp({ data: draft as never });
      toast.success("Saved");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(id: string) {
    await delEmp({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
    toast.success("Deleted");
  }

  const meta = (draft?.country_metadata ?? {}) as Record<string, string>;
  const setMeta = (k: string, v: string) =>
    setDraft((d) => (d ? { ...d, country_metadata: { ...d.country_metadata, [k]: v } } : d));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            {employees.length} people · identifiers drive the Compliance Score
          </p>
        </div>
        <Button onClick={() => edit()}>
          <Plus className="mr-1 h-4 w-4" /> Add employee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Base salary</TableHead>
                <TableHead>{t.taxStatus}</TableHead>
                <TableHead>{t.taxId}</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No employees yet.
                  </TableCell>
                </TableRow>
              )}
              {(employees as Emp[]).map((e) => {
                const score = scoreFindings(evaluateEmployee(e as never));
                const hasNpwp = Boolean((e.country_metadata as Record<string, unknown>)?.npwp);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{e.position || "—"}</TableCell>
                    <TableCell className="tabular-nums">{money(e.base_salary)}</TableCell>
                    <TableCell>{e.marital_status}</TableCell>
                    <TableCell>
                      {hasNpwp ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          "border-0 " +
                          (score >= 85
                            ? "bg-success/15 text-success"
                            : score >= 60
                              ? "bg-warning/15 text-warning"
                              : "bg-destructive/15 text-destructive")
                        }
                      >
                        {score}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => edit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => e.id && remove(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit" : "Add"} employee</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Full name" className="sm:col-span-2">
                <Input
                  value={draft.full_name}
                  onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                />
              </F>
              <F label="Position">
                <Input
                  value={draft.position ?? ""}
                  onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                />
              </F>
              <F label="Department">
                <Input
                  value={draft.department ?? ""}
                  onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                />
              </F>
              <F label={`Base salary (${activePack.currency})`}>
                <Input
                  type="number"
                  value={draft.base_salary}
                  onChange={(e) => setDraft({ ...draft, base_salary: Number(e.target.value) })}
                />
              </F>
              <F label={`Marital status (${t.taxStatus})`}>
                <Select
                  value={draft.marital_status}
                  onValueChange={(v) => setDraft({ ...draft, marital_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label={`Religion (${t.bonus})`}>
                <Select
                  value={draft.religion ?? ""}
                  onValueChange={(v) => setDraft({ ...draft, religion: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELIGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <div className="sm:col-span-2 mt-1 rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {activePack.name} identifiers (country_metadata)
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {t.identifiers.map((f) => {
                    const sensitive = Boolean(
                      sensitiveFieldSpec(activePack.code, f.key) && draft?.id,
                    );
                    return (
                      <F key={f.key} label={f.label}>
                        <div className="flex gap-2">
                          <Input
                            value={(meta[f.key] as string) ?? ""}
                            onChange={(e) => setMeta(f.key, e.target.value)}
                          />
                          {sensitive && (
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              title="Reveal (logged)"
                              onClick={async () => {
                                if (!companyId || !draft?.id) return;
                                try {
                                  const res = await revealFn({
                                    data: {
                                      companyId,
                                      employeeId: draft.id,
                                      field: f.key,
                                      purpose: "payroll_processing",
                                    },
                                  });
                                  if (res.value) {
                                    setMeta(f.key, res.value);
                                    toast.success("Value revealed — access recorded");
                                  } else {
                                    toast.info("No value stored for this field");
                                  }
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Reveal failed");
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </F>
                    );
                  })}
                  <F label="Weekly overtime (h)">
                    <Input
                      type="number"
                      value={meta.weekly_overtime_hours ?? "0"}
                      onChange={(e) => setMeta("weekly_overtime_hours", e.target.value)}
                    />
                  </F>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
