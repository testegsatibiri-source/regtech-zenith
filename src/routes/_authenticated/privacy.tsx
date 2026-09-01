import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, History, FileLock2 } from "lucide-react";
import { useCompany } from "@/lib/companyContext";
import { listEmployees } from "@/lib/data.functions";
import {
  PROCESSING_PURPOSES,
  LEGAL_BASES,
  listConsents,
  upsertConsent,
  listDataAccessLog,
  listRetentionPolicies,
  seedDefaultRetentionPolicies,
  upsertRetentionPolicy,
  getPrivacyReadiness,
} from "@/lib/privacy.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Data Privacy — Consent & Retention | UBoard Compliance OS" },
      {
        name: "description",
        content:
          "Track employee data-processing consent, personal-data access trails and retention policies for Data Privacy Act readiness.",
      },
      { property: "og:title", content: "Data Privacy — Consent & Retention" },
      {
        property: "og:description",
        content: "Consent register, access log and retention schedule for employee personal data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function PrivacyPage() {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const employeesFn = useServerFn(listEmployees);
  const consentsFn = useServerFn(listConsents);
  const saveConsentFn = useServerFn(upsertConsent);
  const logFn = useServerFn(listDataAccessLog);
  const policiesFn = useServerFn(listRetentionPolicies);
  const seedFn = useServerFn(seedDefaultRetentionPolicies);
  const savePolicyFn = useServerFn(upsertRetentionPolicy);
  const readinessFn = useServerFn(getPrivacyReadiness);

  const [employeeId, setEmployeeId] = useState<string>("");
  const [purpose, setPurpose] = useState<string>(PROCESSING_PURPOSES[0]);
  const [legalBasis, setLegalBasis] = useState<string>("consent");
  const [evidenceRef, setEvidenceRef] = useState("");

  const employees = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () => employeesFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const readiness = useQuery({
    queryKey: ["privacy-readiness", companyId],
    queryFn: () => readinessFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const consents = useQuery({
    queryKey: ["consents", companyId],
    queryFn: () => consentsFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const policies = useQuery({
    queryKey: ["retention", companyId],
    queryFn: () => policiesFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const accessLog = useQuery({
    queryKey: ["access-log", companyId],
    queryFn: () => logFn({ data: { companyId: companyId!, limit: 50 } }),
    enabled: !!companyId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["consents", companyId] });
    queryClient.invalidateQueries({ queryKey: ["privacy-readiness", companyId] });
    queryClient.invalidateQueries({ queryKey: ["access-log", companyId] });
  };

  async function recordConsent(granted: boolean) {
    if (!companyId || !employeeId) {
      toast.error("Select an employee first");
      return;
    }
    try {
      await saveConsentFn({
        data: {
          companyId,
          employeeId,
          purpose,
          legalBasis: legalBasis as (typeof LEGAL_BASES)[number],
          granted,
          evidenceRef: evidenceRef || null,
        },
      });
      setEvidenceRef("");
      invalidate();
      toast.success(granted ? "Consent recorded" : "Consent withdrawn");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record consent");
    }
  }

  const employeeName = (id: string | null) =>
    employees.data?.find((e: { id: string }) => e.id === id)?.full_name ?? "—";

  const r = readiness.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Data Privacy
        </h1>
        <p className="text-muted-foreground text-sm">
          Consent register, personal-data access trail and retention schedule (RA 10173 / UU PDP).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Privacy readiness", value: r ? `${r.overall}%` : "—" },
          { label: "Consent coverage", value: r ? `${r.consentScore}%` : "—" },
          { label: "Retention policies", value: r ? `${r.activePolicies}` : "—" },
          { label: "Access log entries", value: r ? `${r.accessLogEntries}` : "—" },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{c.value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record consent</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {(employees.data ?? []).map((e: { id: string; full_name: string }) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCESSING_PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Legal basis</Label>
            <Select value={legalBasis} onValueChange={setLegalBasis}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_BASES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Evidence ref</Label>
            <Input
              value={evidenceRef}
              onChange={(e) => setEvidenceRef(e.target.value)}
              placeholder="Signed form #"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => recordConsent(true)}>Grant</Button>
            <Button variant="outline" onClick={() => recordConsent(false)}>
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      {r && r.missingConsentCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Missing mandatory consents ({r.missingConsentCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {r.missingConsents.map((m) => (
              <Badge key={`${m.employeeId}-${m.purpose}`} variant="outline">
                {m.employeeName} · {m.purpose.replace(/_/g, " ")}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(consents.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No consent records yet.</p>
          )}
          {(consents.data ?? []).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-b py-2 text-sm last:border-0"
            >
              <div>
                <span className="font-medium">{employeeName(c.employee_id)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {c.purpose.replace(/_/g, " ")} · {c.legal_basis.replace(/_/g, " ")}
                </span>
              </div>
              <Badge variant={c.granted ? "default" : "destructive"}>
                {c.granted ? "Granted" : "Withdrawn"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <FileLock2 className="h-4 w-4" /> Retention schedule
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!companyId) return;
              await seedFn({ data: { companyId } });
              queryClient.invalidateQueries({ queryKey: ["retention", companyId] });
              queryClient.invalidateQueries({ queryKey: ["privacy-readiness", companyId] });
              toast.success("Default retention schedule applied");
            }}
          >
            Apply defaults
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(policies.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No retention policies defined.</p>
          )}
          {(policies.data ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 border-b py-2 text-sm last:border-0"
            >
              <div>
                <span className="font-medium">{p.category.replace(/_/g, " ")}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.legal_reference ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-24"
                  defaultValue={p.retention_months}
                  onBlur={async (e) => {
                    const months = Number(e.target.value);
                    if (!companyId || !Number.isFinite(months) || months === p.retention_months)
                      return;
                    await savePolicyFn({
                      data: {
                        companyId,
                        category: p.category,
                        retentionMonths: months,
                        legalReference: p.legal_reference,
                        purgeAction: p.purge_action as "anonymize" | "delete" | "archive",
                        active: p.active,
                      },
                    });
                    queryClient.invalidateQueries({ queryKey: ["retention", companyId] });
                    toast.success("Retention updated");
                  }}
                />
                <span className="text-xs text-muted-foreground">months · {p.purge_action}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Personal-data access trail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(accessLog.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No access recorded yet.</p>
          )}
          {(accessLog.data ?? []).map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between border-b py-2 text-sm last:border-0"
            >
              <span>
                <span className="font-medium">{l.action}</span>{" "}
                <span className="text-muted-foreground">{l.resource}</span>
                {l.employee_id && (
                  <span className="text-muted-foreground"> · {employeeName(l.employee_id)}</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(l.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
