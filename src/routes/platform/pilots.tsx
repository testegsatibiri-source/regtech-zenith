// Backoffice — Pilot Program intake & lifecycle.
//
// This screen only *presents* state and issues intents. Every transition is
// authorized, decided and audited server-side (see `pilot.functions.ts`);
// hiding a button here is UX, not security.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listPilotRequests,
  approvePilotRequest,
  rejectPilotRequest,
  qualifyPilotRequest,
  updatePilotNotes,
  summarizePilotRisk,
} from "@/lib/pilot.functions";
import { NewPilotForm } from "@/components/platform/NewPilotForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/platform/pilots")({
  component: PilotsPage,
});

const STATUSES = ["new", "qualified", "approved", "converted", "rejected"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  new: "secondary",
  qualified: "outline",
  approved: "default",
  converted: "default",
  rejected: "destructive",
};

function fmt(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

function PilotsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPilotRequests);
  const approveFn = useServerFn(approvePilotRequest);
  const rejectFn = useServerFn(rejectPilotRequest);
  const qualifyFn = useServerFn(qualifyPilotRequest);
  const notesFn = useServerFn(updatePilotNotes);

  const [status, setStatus] = useState<Status | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "pilots", status],
    queryFn: () => listFn({ data: { limit: 200, ...(status === "all" ? {} : { status }) } }),
  });

  const rows = (data ?? []) as unknown as Row[];
  const current = rows.find((r) => r.id === selected) ?? null;

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["platform", "pilots"] });
  }

  const approve = useMutation({
    mutationFn: (vars: { id: string; authorizedCountry: "ID" | "PH" | "BOTH"; pilotExpiresAt: string | null; reason: string | null }) =>
      approveFn({ data: vars }),
    onSuccess: () => {
      toast.success("Pilot approved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => rejectFn({ data: vars }),
    onSuccess: () => {
      toast.success("Pilot rejected");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const qualify = useMutation({
    mutationFn: (vars: { id: string }) => qualifyFn({ data: vars }),
    onSuccess: () => {
      toast.success("Marked as qualified");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNotes = useMutation({
    mutationFn: (vars: { id: string; notes: string }) => notesFn({ data: vars }),
    onSuccess: () => {
      toast.success("Notes saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = STATUSES.map((s) => ({ s, n: rows.filter((r) => r.status === s).length }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Pilot Program</h1>
          <p className="text-muted-foreground">
            Controlled access intake for Indonesia and the Philippines. Approval grants workspace
            creation for the authorized jurisdiction only.
          </p>
        </div>
        {!showNew && <Button onClick={() => setShowNew(true)}>New pilot customer</Button>}
      </header>

      {showNew && (
        <NewPilotForm
          onCancel={() => setShowNew(false)}
          onDone={() => {
            setShowNew(false);
            invalidate();
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={status === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatus("all")}
        >
          All ({rows.length})
        </Button>
        {counts.map(({ s, n }) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(s)}
          >
            {s} {status === "all" ? `(${n})` : ""}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-muted-foreground">No pilot requests in this view.</p>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected(r.id)}
                    className={[
                      "flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition-colors",
                      selected === r.id ? "bg-primary/5" : "hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.company_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.full_name} · {r.email}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {r.source} · {fmt(r.created_at)} · {r.employee_range ?? "size n/a"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={STATUS_VARIANT[r.status as Status]}>{r.status}</Badge>
                      {r.authorized_country ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {r.authorized_country}
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {current ? (
          <RequestDetail
            key={current.id}
            request={current}
            onQualify={() => qualify.mutate({ id: current.id })}
            onApprove={(v) => approve.mutate({ id: current.id, ...v })}
            onReject={(reason) => reject.mutate({ id: current.id, reason })}
            onSaveNotes={(notes) => saveNotes.mutate({ id: current.id, notes })}
            busy={approve.isPending || reject.isPending || qualify.isPending}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Select a request to review eligibility and decide.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/** Explicit view model: the list projection, not the whole table row. */
interface Row {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  employee_range: string | null;
  role: string | null;
  status: string;
  source: string | null;
  created_at: string;
  approved_at: string | null;
  authorized_country: string | null;
  pilot_expires_at: string | null;
  decision_reason: string | null;
  converted_company_id: string | null;
  converted_at: string | null;
  workforce_all_ncr: boolean | null;
  has_overtime: boolean | null;
  consent_version: string | null;
  notes: string | null;
}

function RequestDetail(props: {
  request: Row;
  busy: boolean;
  onQualify: () => void;
  onApprove: (v: {
    authorizedCountry: "ID" | "PH" | "BOTH";
    pilotExpiresAt: string | null;
    reason: string | null;
  }) => void;
  onReject: (reason: string) => void;
  onSaveNotes: (notes: string) => void;
}) {
  const r = props.request;
  const inferred: "ID" | "PH" = r.source?.includes("-id") ? "ID" : "PH";
  const [country, setCountry] = useState<"ID" | "PH" | "BOTH">(
    (r.authorized_country as "ID" | "PH" | "BOTH" | null) ?? inferred,
  );
  const [expires, setExpires] = useState<string>(
    r.pilot_expires_at ? String(r.pilot_expires_at).slice(0, 10) : "",
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState(r.notes ?? "");

  const locked = r.status === "converted";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{r.company_name}</CardTitle>
        <div className="text-xs text-muted-foreground">
          {r.full_name} · {r.role ?? "role n/a"} · {r.email}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Field label="Status" value={r.status} />
          <Field label="Source" value={r.source ?? "—"} />
          <Field label="Workforce" value={r.employee_range ?? "—"} />
          <Field label="Consent" value={r.consent_version ?? "—"} />
          <Field label="All NCR" value={fmtBool(r.workforce_all_ncr)} />
          <Field label="Has overtime" value={fmtBool(r.has_overtime)} />
          <Field label="Approved at" value={fmt(r.approved_at)} />
          <Field label="Expires" value={fmt(r.pilot_expires_at)} />
        </dl>

        {/* Philippines scope reminder: the pack is validated for NCR without
            an overtime engine, so these two answers are disqualifying. */}
        {inferred === "PH" && (r.workforce_all_ncr === false || r.has_overtime === true) ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            Outside the validated Philippines scope: the pack currently covers NCR wage orders and
            has no overtime engine. Approve only with an explicit, documented restriction.
          </p>
        ) : null}

        <div className="space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Authorized jurisdiction</Label>
              <Select
                value={country}
                onValueChange={(v) => setCountry(v as "ID" | "PH" | "BOTH")}
                disabled={locked}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ID">Indonesia</SelectItem>
                  <SelectItem value="PH">Philippines</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires">Pilot expires (optional)</Label>
              <Input
                id="expires"
                type="date"
                value={expires}
                disabled={locked}
                onChange={(e) => setExpires(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Decision reason</Label>
            <Textarea
              id="reason"
              rows={2}
              value={reason}
              disabled={locked}
              placeholder="Scope, restrictions, or rejection rationale"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={props.busy || locked}
              onClick={() =>
                props.onApprove({
                  authorizedCountry: country,
                  pilotExpiresAt: expires ? new Date(`${expires}T23:59:59Z`).toISOString() : null,
                  reason: reason.trim() || null,
                })
              }
            >
              Approve pilot
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={props.busy || locked}
              onClick={props.onQualify}
            >
              Mark qualified
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={props.busy || locked || reason.trim().length === 0}
              onClick={() => props.onReject(reason.trim())}
            >
              Reject
            </Button>
          </div>
          {locked ? (
            <p className="text-xs text-muted-foreground">
              This request already converted into a workspace and is locked.
            </p>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <Label htmlFor="notes">Internal compliance notes</Label>
          <Textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button size="sm" variant="secondary" onClick={() => props.onSaveNotes(notes)}>
            Save notes
          </Button>
        </div>

        <RiskSummary id={r.id} notes={notes} />
      </CardContent>
    </Card>
  );
}

function RiskSummary(props: { id: string; notes: string }) {
  const fn = useServerFn(summarizePilotRisk);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: props.id, notes: props.notes } }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <Label>AI case summary &amp; compliance risks</Label>
        <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? "Analyzing…" : m.data ? "Regenerate" : "Analyze case"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Advisory only — uses the case data and the notes above (contact name and e-mail are not
        sent). The decision remains with the operator.
      </p>
      {m.data ? (
        <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm">
          {m.data.summary}
        </div>
      ) : null}
    </div>
  );
}


function fmtBool(v: boolean | null | undefined): string {
  return v === null || v === undefined ? "—" : v ? "Yes" : "No";
}

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{props.label}</dt>
      <dd className="font-mono text-xs">{props.value}</dd>
    </div>
  );
}
