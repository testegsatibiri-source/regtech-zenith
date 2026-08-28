import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Check, X, Trash2 } from "lucide-react";
import { useCompany } from "@/lib/companyContext";
import { listEmployees } from "@/lib/data.functions";
import {
  listDependents,
  upsertDependent,
  deleteDependent,
  listJobHistory,
  upsertJobHistory,
  deleteJobHistory,
  getEmployeeDossier,
  updateSoloParentStatus,
} from "@/lib/personnel.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/personnel")({
  component: PersonnelPage,
  head: () => ({
    meta: [
      { title: "201 File — Employee Dossier | UBoard Compliance OS" },
      {
        name: "description",
        content:
          "Maintain the statutory employee dossier: dependents, job and salary history, and a completeness checklist for labor inspections.",
      },
      { property: "og:title", content: "201 File — Employee Dossier" },
      {
        property: "og:description",
        content: "Dependents, job history and dossier completeness for every employee.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const RELATIONSHIPS = ["spouse", "child", "parent", "sibling", "other"] as const;
const REASONS = ["hire", "promotion", "salary_adjustment", "regularization", "transfer", "other"] as const;

function PersonnelPage() {
  const { companyId, company } = useCompany();
  const queryClient = useQueryClient();

  const dependentsFn = useServerFn(listDependents);
  const saveDependentFn = useServerFn(upsertDependent);
  const removeDependentFn = useServerFn(deleteDependent);
  const historyFn = useServerFn(listJobHistory);
  const saveHistoryFn = useServerFn(upsertJobHistory);
  const removeHistoryFn = useServerFn(deleteJobHistory);
  const dossierFn = useServerFn(getEmployeeDossier);
  const soloParentFn = useServerFn(updateSoloParentStatus);

  const [employeeId, setEmployeeId] = useState("");
  const [depName, setDepName] = useState("");
  const [depRelationship, setDepRelationship] = useState<(typeof RELATIONSHIPS)[number]>("child");
  const [depBirth, setDepBirth] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobDate, setJobDate] = useState("");
  const [jobReason, setJobReason] = useState<(typeof REASONS)[number]>("hire");
  const [busy, setBusy] = useState(false);
  const [spEnabled, setSpEnabled] = useState(false);
  const [spId, setSpId] = useState("");
  const [spExpiry, setSpExpiry] = useState("");

  async function saveSoloParent(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !employeeId) return;
    setBusy(true);
    try {
      await soloParentFn({
        data: {
          companyId,
          employeeId,
          soloParent: spEnabled,
          idNumber: spId || null,
          expiresOn: spExpiry || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["dossier", companyId, employeeId] });
      toast.success("Solo Parent ID updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  const employeesQuery = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () => listEmployees({ data: { companyId: companyId! } }),
    enabled: Boolean(companyId),
  });
  const scope = { companyId: companyId!, employeeId };
  const depsQuery = useQuery({
    queryKey: ["dependents", companyId, employeeId],
    queryFn: () => dependentsFn({ data: scope }),
    enabled: Boolean(companyId && employeeId),
  });
  const historyQuery = useQuery({
    queryKey: ["job-history", companyId, employeeId],
    queryFn: () => historyFn({ data: scope }),
    enabled: Boolean(companyId && employeeId),
  });
  const dossierQuery = useQuery({
    queryKey: ["dossier", companyId, employeeId],
    queryFn: () => dossierFn({ data: scope }),
    enabled: Boolean(companyId && employeeId),
  });

  if (!companyId) return <p className="text-muted-foreground">Create a company first.</p>;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dependents", companyId, employeeId] }),
      queryClient.invalidateQueries({ queryKey: ["job-history", companyId, employeeId] }),
      queryClient.invalidateQueries({ queryKey: ["dossier", companyId, employeeId] }),
    ]);
  }

  async function addDependent(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !depName) {
      toast.error("Select an employee and enter the dependent name");
      return;
    }
    setBusy(true);
    try {
      await saveDependentFn({
        data: {
          companyId: companyId!,
          employeeId,
          fullName: depName,
          relationship: depRelationship,
          birthDate: depBirth || null,
          isPwd: false,
          isStudent: false,
          isQualifiedDependent: true,
          notes: null,
        },
      });
      setDepName("");
      setDepBirth("");
      await refresh();
      toast.success("Dependent recorded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addHistory(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !jobDate) {
      toast.error("Select an employee and an effective date");
      return;
    }
    setBusy(true);
    try {
      await saveHistoryFn({
        data: {
          companyId: companyId!,
          employeeId,
          position: jobPosition || null,
          department: null,
          baseSalary: Number(jobSalary || 0),
          employmentType: null,
          effectiveDate: jobDate,
          changeReason: jobReason,
          notes: null,
        },
      });
      setJobPosition("");
      setJobSalary("");
      setJobDate("");
      await refresh();
      toast.success("History entry recorded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const dossier = dossierQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">201 File</h1>
          <p className="text-muted-foreground">{company?.name} · employee dossier</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {(employeesQuery.data ?? []).map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {dossier && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant={dossier.complete ? "default" : "secondary"}>
                  {dossier.completeness}% complete
                </Badge>
                <span className="text-sm text-muted-foreground">
                  PH-201-FILE dossier checklist
                </span>
              </div>
              <ul className="space-y-2">
                {dossier.checks.map((c) => (
                  <li key={c.code} className="flex items-start gap-2 rounded-lg border p-3">
                    {c.passed ? (
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <form onSubmit={saveSoloParent} className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Solo Parent ID (RA 8972 / RA 11861)</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={spEnabled}
                    onChange={(e) => setSpEnabled(e.target.checked)}
                  />
                  Employee is a registered solo parent
                </label>
                {spEnabled && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>ID number</Label>
                      <Input value={spId} onChange={(e) => setSpId(e.target.value)} placeholder="SP-2026-0001" />
                    </div>
                    <div className="space-y-2">
                      <Label>Valid until</Label>
                      <Input type="date" value={spExpiry} onChange={(e) => setSpExpiry(e.target.value)} />
                    </div>
                  </div>
                )}
                <Button type="submit" size="sm" disabled={busy}>
                  Save solo parent status
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {employeeId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Dependents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={addDependent} className="space-y-3">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={depName} onChange={(e) => setDepName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Select
                      value={depRelationship}
                      onValueChange={(v) => setDepRelationship(v as (typeof RELATIONSHIPS)[number])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Birth date</Label>
                    <Input type="date" value={depBirth} onChange={(e) => setDepBirth(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" disabled={busy}>
                  Add dependent
                </Button>
              </form>

              <div className="space-y-2">
                {(depsQuery.data ?? []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{d.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.relationship}
                        {d.birth_date ? ` · ${d.birth_date}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await removeDependentFn({ data: { id: d.id } });
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {!(depsQuery.data ?? []).length && (
                  <p className="text-sm text-muted-foreground">No dependents recorded.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job & salary history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={addHistory} className="space-y-3">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input value={jobPosition} onChange={(e) => setJobPosition(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Base salary</Label>
                    <Input
                      type="number"
                      value={jobSalary}
                      onChange={(e) => setJobSalary(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Effective date</Label>
                    <Input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={jobReason} onValueChange={(v) => setJobReason(v as (typeof REASONS)[number])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={busy}>
                  Add entry
                </Button>
              </form>

              <div className="space-y-2">
                {(historyQuery.data ?? []).map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {h.position ?? "—"} · {Number(h.base_salary).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.effective_date} · {String(h.change_reason).replace("_", " ")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await removeHistoryFn({ data: { id: h.id } });
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {!(historyQuery.data ?? []).length && (
                  <p className="text-sm text-muted-foreground">No history entries yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
