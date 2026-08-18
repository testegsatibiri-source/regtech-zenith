import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileDown, Loader2, ShieldAlert, CheckCircle2, RefreshCw, Trash2, FileWarning,
} from "lucide-react";
import {
  listFilingForms, listFilings, generateFiling, getFilingArtifact,
  markFilingSubmitted, deleteFiling, flagStaleFilings,
} from "@/lib/filings.functions";
import { useCompany } from "@/lib/companyContext";
import { useActivePack } from "@/lib/packs/useActivePack";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/filings")({
  component: FilingsPage,
  head: () => ({
    meta: [
      { title: "Statutory Filings — UBoard Compliance OS" },
      {
        name: "description",
        content:
          "Generate BIR, SSS, PhilHealth and Pag-IBIG remittance files from finalized payroll, with checksum, ruleset stamp and submission receipts.",
      },
      { property: "og:title", content: "Statutory Filings — UBoard Compliance OS" },
      {
        property: "og:description",
        content: "Agency-ready filing exports stamped with the ruleset version that produced them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_STYLE: Record<string, string> = {
  generated: "bg-accent/15 text-accent border-accent/40",
  submitted: "bg-success/15 text-success border-success/40",
  stale: "bg-warning/15 text-warning border-warning/40",
  amended: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
};

function FilingsPage() {
  const { companyId, company } = useCompany();
  const activePack = useActivePack();
  const queryClient = useQueryClient();

  const forms = useServerFn(listFilingForms);
  const list = useServerFn(listFilings);
  const generate = useServerFn(generateFiling);
  const fetchArtifact = useServerFn(getFilingArtifact);
  const markSubmitted = useServerFn(markFilingSubmitted);
  const removeFiling = useServerFn(deleteFiling);
  const flagStale = useServerFn(flagStaleFilings);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [formCode, setFormCode] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const formsQuery = useQuery({
    queryKey: ["filing-forms", activePack.code],
    queryFn: () => forms({ data: { country: activePack.code } }),
    enabled: Boolean(activePack.code),
  });

  const filingsQuery = useQuery({
    queryKey: ["filings", companyId],
    queryFn: () => list({ data: { companyId: companyId! } }),
    enabled: Boolean(companyId),
  });

  const available = formsQuery.data ?? [];
  const selected = available.find((f) => f.code === formCode) ?? available[0];

  if (!companyId) return <p className="text-muted-foreground">Create a company first.</p>;

  async function onGenerate(amends?: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await generate({
        data: {
          companyId: companyId!,
          formCode: selected.code,
          year,
          month: selected.scope === "period" ? month : undefined,
          amendsFilingId: amends,
        },
      });
      if (res.rowCount === 0) {
        toast.warning("Filing generated with zero rows — no finalized payroll for this period");
      } else if (res.warnings.length) {
        toast.warning(`${res.warnings.length} blocking issue(s) — see the filing card`);
      } else {
        toast.success(`${selected.code} generated · ${res.rowCount} row(s)`);
      }
      await queryClient.invalidateQueries({ queryKey: ["filings", companyId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  async function onDownload(id: string) {
    try {
      const row = await fetchArtifact({ data: { filingId: id } });
      const blob = new Blob([row.artifact_content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.artifact_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onConfirmReceipt() {
    if (!receiptFor || !reference.trim()) return;
    try {
      await markSubmitted({ data: { filingId: receiptFor, reference: reference.trim(), notes: notes || undefined } });
      toast.success("Submission receipt recorded");
      setReceiptFor(null);
      setReference("");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["filings", companyId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onCheckStale() {
    try {
      const res = await flagStale({ data: { companyId: companyId! } });
      toast.success(
        res.staleCount === 0
          ? `All filings match the current ruleset (${res.current})`
          : `${res.staleCount} filing(s) flagged stale against ${res.current}`,
      );
      await queryClient.invalidateQueries({ queryKey: ["filings", companyId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const filings = filingsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Statutory filings</h1>
          <p className="text-muted-foreground">
            {company?.name} · {activePack.name} Country Pack
            {activePack.rulesetVersion ? ` · ${activePack.rulesetVersion}` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={onCheckStale}>
          <RefreshCw className="mr-1 h-4 w-4" /> Check ruleset drift
        </Button>
      </div>

      {available.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            The {activePack.name} Country Pack does not expose statutory filing exports yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate an agency file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1">
                <Label className="mb-1 block text-xs">Form</Label>
                <Select value={selected?.code ?? ""} onValueChange={setFormCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {available.map((f) => (
                      <SelectItem key={f.code} value={f.code}>{f.code} — {f.agency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selected?.scope === "period" && (
                <div className="w-28">
                  <Label className="mb-1 block text-xs">Month</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="w-28">
                <Label className="mb-1 block text-xs">Year</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[year - 1, year, year + 1].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => onGenerate()} disabled={busy}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}
                Generate
              </Button>
            </div>
            {selected && (
              <p className="text-xs text-muted-foreground">
                {selected.title} · {selected.legalBasis} · {selected.format.toUpperCase()} upload — {selected.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filingsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading filings…</p>}
        {!filingsQuery.isLoading && filings.length === 0 && (
          <Card><CardContent className="py-8 text-sm text-muted-foreground">No filings generated yet.</CardContent></Card>
        )}
        {filings.map((f) => {
          const warnings = (f.warnings ?? []) as string[];
          return (
            <Card key={f.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{f.form_code}</span>
                      <Badge variant="outline" className={STATUS_STYLE[f.status] ?? ""}>{f.status}</Badge>
                      <Badge variant="outline">{f.ruleset_version}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.form_title}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {f.period_month ? `${MONTHS[f.period_month - 1]} ` : ""}{f.period_year} · {f.row_count} row(s) ·
                      {" "}sha256 {f.artifact_checksum.slice(0, 16)}…
                    </p>
                    {f.submission_reference && (
                      <p className="mt-1 text-xs text-success">
                        Receipt {f.submission_reference}
                        {f.submitted_at ? ` · ${new Date(f.submitted_at).toLocaleDateString()}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onDownload(f.id)}>
                      <FileDown className="mr-1 h-4 w-4" /> Download
                    </Button>
                    {!f.submitted_at && (
                      <Button size="sm" onClick={() => setReceiptFor(f.id)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Mark submitted
                      </Button>
                    )}
                    {f.status === "stale" && (
                      <Button size="sm" variant="secondary" onClick={() => onGenerate(f.id)} disabled={busy}>
                        <FileWarning className="mr-1 h-4 w-4" /> Amended filing
                      </Button>
                    )}
                    {!f.submitted_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await removeFiling({ data: { filingId: f.id } });
                          await queryClient.invalidateQueries({ queryKey: ["filings", companyId] });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {warnings.length > 0 && (
                  <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                    {warnings.map((w) => (
                      <li key={w} className="flex gap-2">
                        <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" /> {w}
                      </li>
                    ))}
                  </ul>
                )}
                {f.status === "stale" && (
                  <p className="text-xs text-muted-foreground">
                    Generated under an earlier ruleset. Submitted artifacts are never rewritten — file an amended
                    return instead (DEBT-023).
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(receiptFor)} onOpenChange={(o) => !o && setReceiptFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record submission receipt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs">Agency reference / confirmation number</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. eFPS 2026-0000123" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Filed via eFPS by finance" />
            </div>
            <p className="text-xs text-muted-foreground">
              Once recorded, the artifact becomes immutable: corrections require an amended filing.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptFor(null)}>Cancel</Button>
            <Button onClick={onConfirmReceipt} disabled={!reference.trim()}>Save receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
