import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, History, FileLock2, KeyRound, Siren, UserSearch } from "lucide-react";
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
  getFieldEncryptionStatus,
  migrateSensitiveFields,
  listDataProtectionOfficers,
  upsertDataProtectionOfficer,
  listPrivacyIncidents,
  upsertPrivacyIncident,
  listDataSubjectRequests,
  upsertDataSubjectRequest,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  DSR_TYPES,
  DSR_STATUSES,
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

  const encryptionFn = useServerFn(getFieldEncryptionStatus);
  const sealFn = useServerFn(migrateSensitiveFields);
  const dpoListFn = useServerFn(listDataProtectionOfficers);
  const dpoSaveFn = useServerFn(upsertDataProtectionOfficer);
  const incidentsFn = useServerFn(listPrivacyIncidents);
  const incidentSaveFn = useServerFn(upsertPrivacyIncident);
  const dsrListFn = useServerFn(listDataSubjectRequests);
  const dsrSaveFn = useServerFn(upsertDataSubjectRequest);

  const encryption = useQuery({
    queryKey: ["field-encryption", companyId],
    queryFn: () => encryptionFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const officers = useQuery({
    queryKey: ["dpo", companyId],
    queryFn: () => dpoListFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const incidents = useQuery({
    queryKey: ["privacy-incidents", companyId],
    queryFn: () => incidentsFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const requests = useQuery({
    queryKey: ["dsr", companyId],
    queryFn: () => dsrListFn({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [dpoName, setDpoName] = useState("");
  const [dpoEmail, setDpoEmail] = useState("");
  const [dpoPhone, setDpoPhone] = useState("");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentSeverity, setIncidentSeverity] =
    useState<(typeof INCIDENT_SEVERITIES)[number]>("medium");
  const [incidentAffected, setIncidentAffected] = useState("0");
  const [dsrType, setDsrType] = useState<(typeof DSR_TYPES)[number]>("access");
  const [dsrEmployee, setDsrEmployee] = useState("");
  const [dsrEmail, setDsrEmail] = useState("");

  const officer = officers.data?.[0];
  const enc = encryption.data;
  const overdueIncidents = (incidents.data ?? []).filter(
    (i) => !i.authority_notified_at && new Date(i.notification_deadline) < new Date(),
  ).length;

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
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Sensitive field encryption
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={!companyId || !enc?.keyConfigured || (enc?.plaintext ?? 0) === 0}
            onClick={async () => {
              if (!companyId) return;
              try {
                const res = await sealFn({ data: { companyId } });
                queryClient.invalidateQueries({ queryKey: ["field-encryption", companyId] });
                queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
                toast.success(
                  `${res.migrated} value(s) sealed across ${res.employeesTouched} employee(s)`,
                );
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Sealing failed");
              }
            }}
          >
            Seal pending values
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={enc?.keyConfigured ? "default" : "destructive"}>
              {enc?.keyConfigured ? "Encryption key configured" : "Encryption key missing"}
            </Badge>
            <Badge variant="outline">{enc?.sealed ?? 0} sealed</Badge>
            <Badge variant={(enc?.plaintext ?? 0) > 0 ? "destructive" : "outline"}>
              {enc?.plaintext ?? 0} plaintext
            </Badge>
            {(enc?.trackedFields ?? []).map((f) => (
              <Badge key={f} variant="secondary">
                {f.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Identifiers such as NIK, NPWP and bank accounts are stored encrypted (AES-GCM) with a
            key held outside the database, and are only shown in full through an audited reveal — UU
            27/2022 art. 35 security measures.
          </p>
          {(enc?.pendingCount ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {enc!.pending.map((p) => (
                <Badge key={p.employeeId} variant="outline">
                  {p.employeeName} · {p.fields.join(", ")}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Data protection officer
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={dpoName || (officer?.full_name ?? "")}
                      onChange={(e) => setDpoName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={dpoEmail || (officer?.email ?? "")}
                      onChange={(e) => setDpoEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={dpoPhone || (officer?.phone ?? "")}
                      onChange={(e) => setDpoPhone(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={async () => {
                        if (!companyId) return;
                        const fullName = dpoName || officer?.full_name || "";
                        const email = dpoEmail || officer?.email || "";
                        if (!fullName || !email) {
                          toast.error("Name and email are required");
                          return;
                        }
                        try {
                          await dpoSaveFn({
                            data: {
                              companyId,
                              fullName,
                              email,
                              phone: dpoPhone || officer?.phone || null,
                              jurisdiction: "ID",
                            },
                          });
                          queryClient.invalidateQueries({ queryKey: ["dpo", companyId] });
                          toast.success("Data protection officer saved");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to save officer");
                        }
                      }}
                    >
                      Save officer
                    </Button>
                  </div>
                  <p className="md:col-span-4 text-xs text-muted-foreground">
                    UU 27/2022 art. 53 requires an appointed officer when processing personal data
                    on a large scale or as a core activity.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Siren className="h-4 w-4" /> Privacy incidents (72-hour notification)
                  </CardTitle>
                  {overdueIncidents > 0 && (
                    <Badge variant="destructive">{overdueIncidents} past deadline</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Title</Label>
                      <Input
                        value={incidentTitle}
                        onChange={(e) => setIncidentTitle(e.target.value)}
                        placeholder="Unauthorised export of payroll data"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select
                        value={incidentSeverity}
                        onValueChange={(v) =>
                          setIncidentSeverity(v as (typeof INCIDENT_SEVERITIES)[number])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INCIDENT_SEVERITIES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Affected people</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={incidentAffected}
                          onChange={(e) => setIncidentAffected(e.target.value)}
                        />
                        <Button
                          onClick={async () => {
                            if (!companyId || !incidentTitle) {
                              toast.error("Describe the incident first");
                              return;
                            }
                            try {
                              await incidentSaveFn({
                                data: {
                                  companyId,
                                  title: incidentTitle,
                                  severity: incidentSeverity,
                                  status: "open",
                                  affectedCount: Number(incidentAffected) || 0,
                                },
                              });
                              setIncidentTitle("");
                              setIncidentAffected("0");
                              queryClient.invalidateQueries({
                                queryKey: ["privacy-incidents", companyId],
                              });
                              toast.success("Incident logged — 72-hour clock started");
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Failed to log incident",
                              );
                            }
                          }}
                        >
                          Log
                        </Button>
                      </div>
                    </div>
                  </div>

                  {(incidents.data ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No incidents recorded.</p>
                  )}
                  {(incidents.data ?? []).map((i) => {
                    const overdue =
                      !i.authority_notified_at && new Date(i.notification_deadline) < new Date();
                    return (
                      <div
                        key={i.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0"
                      >
                        <div>
                          <span className="font-medium">{i.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {i.severity} · {i.affected_count} affected · deadline{" "}
                            {new Date(i.notification_deadline).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={overdue ? "destructive" : "outline"}>
                            {i.authority_notified_at
                              ? "authority notified"
                              : overdue
                                ? "overdue"
                                : i.status}
                          </Badge>
                          {!i.authority_notified_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!companyId) return;
                                await incidentSaveFn({
                                  data: {
                                    companyId,
                                    id: i.id,
                                    title: i.title,
                                    severity: i.severity as (typeof INCIDENT_SEVERITIES)[number],
                                    status: "notified",
                                    affectedCount: i.affected_count,
                                    detectedAt: i.detected_at,
                                    authorityNotifiedAt: new Date().toISOString(),
                                  },
                                });
                                queryClient.invalidateQueries({
                                  queryKey: ["privacy-incidents", companyId],
                                });
                                toast.success("Notification recorded");
                              }}
                            >
                              Mark notified
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserSearch className="h-4 w-4" /> Data subject requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Request type</Label>
                      <Select
                        value={dsrType}
                        onValueChange={(v) => setDsrType(v as (typeof DSR_TYPES)[number])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DSR_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Employee</Label>
                      <Select value={dsrEmployee} onValueChange={setDsrEmployee}>
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
                      <Label>Contact email</Label>
                      <Input value={dsrEmail} onChange={(e) => setDsrEmail(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={async () => {
                          if (!companyId) return;
                          try {
                            await dsrSaveFn({
                              data: {
                                companyId,
                                employeeId: dsrEmployee || null,
                                requestType: dsrType,
                                requesterEmail: dsrEmail || null,
                                status: "received",
                              },
                            });
                            setDsrEmail("");
                            queryClient.invalidateQueries({ queryKey: ["dsr", companyId] });
                            toast.success("Request registered");
                          } catch (e) {
                            toast.error(
                              e instanceof Error ? e.message : "Failed to register request",
                            );
                          }
                        }}
                      >
                        Register
                      </Button>
                    </div>
                  </div>

                  {(requests.data ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No requests received.</p>
                  )}
                  {(requests.data ?? []).map((q) => (
                    <div
                      key={q.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0"
                    >
                      <div>
                        <span className="font-medium">{q.request_type}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {employeeName(q.employee_id)} · due{" "}
                          {new Date(q.due_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Select
                        value={q.status}
                        onValueChange={async (v) => {
                          if (!companyId) return;
                          await dsrSaveFn({
                            data: {
                              companyId,
                              id: q.id,
                              employeeId: q.employee_id,
                              requestType: q.request_type as (typeof DSR_TYPES)[number],
                              requesterEmail: q.requester_email,
                              status: v as (typeof DSR_STATUSES)[number],
                              resolvedAt:
                                v === "fulfilled" || v === "rejected"
                                  ? new Date().toISOString()
                                  : null,
                            },
                          });
                          queryClient.invalidateQueries({ queryKey: ["dsr", companyId] });
                          toast.success("Request updated");
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DSR_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
