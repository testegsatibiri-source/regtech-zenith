// H23-C — Indonesia separation panel (PP 35/2021 + MK 168/PUU-XXI/2023).
// Previews component-by-component with full evidence, then finalizes into an
// immutable separation_cases record (hash + snapshot). No auto PKWTT conversion.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, Calculator, CheckCircle2, FileLock2, Scale } from "lucide-react";
import {
  computeIdSeparationPreview,
  finalizeIdSeparationCase,
  listIdSeparationCases,
  listIdSeparationReasons,
} from "@/lib/id-separation.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fmtIdr = (n: number) =>
  n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

type Preview = Awaited<ReturnType<typeof computeIdSeparationPreview>>;

export function IdSeparationPanel({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const reasonsFn = useServerFn(listIdSeparationReasons);
  const previewFn = useServerFn(computeIdSeparationPreview);
  const finalizeFn = useServerFn(finalizeIdSeparationCase);
  const casesFn = useServerFn(listIdSeparationCases);

  const [fullName, setFullName] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [separationDate, setSeparationDate] = useState("");
  const [contractType, setContractType] = useState<"PKWT" | "PKWTT">("PKWTT");
  const [reasonCode, setReasonCode] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [fixedAllowances, setFixedAllowances] = useState("");
  const [unusedLeaveDays, setUnusedLeaveDays] = useState("");
  const [uangPisah, setUangPisah] = useState("");
  const [pkwtStart, setPkwtStart] = useState("");
  const [pkwtEnd, setPkwtEnd] = useState("");
  const [pkwtMonths, setPkwtMonths] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  const reasonsQuery = useQuery({
    queryKey: ["id-separation-reasons"],
    queryFn: () => reasonsFn({}),
  });
  const casesQuery = useQuery({
    queryKey: ["id-separation-cases", companyId],
    queryFn: () => casesFn({ data: { companyId } }),
  });

  const reasons = reasonsQuery.data ?? [];
  const selected = reasons.find((r) => r.code === reasonCode);
  const ent = selected?.entitlement;

  function buildInput() {
    return {
      companyId,
      employeeId: crypto.randomUUID(),
      fullName: fullName || "Employee",
      joinDate,
      separationDate,
      contractType,
      pkwt:
        contractType === "PKWT" && pkwtStart && pkwtEnd
          ? {
              startDate: pkwtStart,
              endDate: pkwtEnd,
              totalDurationMonths: Number(pkwtMonths || 12),
            }
          : undefined,
      reasonCode,
      wageBase: {
        baseSalary: Number(baseSalary || 0),
        fixedAllowances: fixedAllowances ? Number(fixedAllowances) : undefined,
      },
      extras: {
        unusedLeaveDays: unusedLeaveDays ? Number(unusedLeaveDays) : undefined,
        uangPisahAmount: uangPisah ? Number(uangPisah) : undefined,
      },
    };
  }

  async function onPreview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await previewFn({ data: buildInput() });
      setPreview(res);
      if (res.status === "blocked")
        toast.error("Calculation blocked — outside the normative window");
      else if (!res.completeness.complete)
        toast.warning("Incomplete inputs — check the evidence panel");
      else toast.success("Statutory minimum computed");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFinalize() {
    if (!preview || preview.status !== "computed") return;
    setBusy(true);
    try {
      const res = await finalizeFn({ data: buildInput() });
      toast.success(`Case recorded — hash ${res.calculationHash.slice(0, 12)}…`);
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: ["id-separation-cases", companyId] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Hitung pesangon (PP 35/2021)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onPreview} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama karyawan</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Budi Santoso"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jenis kontrak</Label>
                  <Select
                    value={contractType}
                    onValueChange={(v) => setContractType(v as "PKWT" | "PKWTT")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKWTT">PKWTT (permanen)</SelectItem>
                      <SelectItem value="PKWT">PKWT (kontrak)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal masuk</Label>
                  <Input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal pemutusan</Label>
                  <Input
                    type="date"
                    value={separationDate}
                    onChange={(e) => setSeparationDate(e.target.value)}
                  />
                </div>
                {contractType === "PKWT" && (
                  <>
                    <div className="space-y-2">
                      <Label>PKWT mulai</Label>
                      <Input
                        type="date"
                        value={pkwtStart}
                        onChange={(e) => setPkwtStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PKWT selesai</Label>
                      <Input
                        type="date"
                        value={pkwtEnd}
                        onChange={(e) => setPkwtEnd(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Durasi kontrak (bulan)</Label>
                      <Input
                        type="number"
                        value={pkwtMonths}
                        onChange={(e) => setPkwtMonths(e.target.value)}
                        placeholder="12"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Gaji pokok (IDR/bulan)</Label>
                  <Input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    placeholder="5500000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tunjangan tetap (IDR)</Label>
                  <Input
                    type="number"
                    value={fixedAllowances}
                    onChange={(e) => setFixedAllowances(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Alasan pemutusan</Label>
                  <Select value={reasonCode} onValueChange={setReasonCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih alasan (PP 35/2021)" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasons.map((r) => (
                        <SelectItem key={r.code} value={r.code}>
                          {r.titleId} — {r.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cuti belum diambil (hari)</Label>
                  <Input
                    type="number"
                    value={unusedLeaveDays}
                    onChange={(e) => setUnusedLeaveDays(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Uang pisah (jika berlaku, IDR)</Label>
                  <Input
                    type="number"
                    value={uangPisah}
                    onChange={(e) => setUangPisah(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {ent && (
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Matriks hak (entitlements)</p>
                  <p>
                    Pesangon{" "}
                    {ent.pesangon?.applicable ? `${ent.pesangon.multiplier ?? 1}×` : "tidak"}
                    {` · UPMK ${ent.upmk?.applicable ? `${ent.upmk.multiplier ?? 1}×` : "tidak"}`}
                    {` · UPH ${ent.uph.applicable ? "ya" : "tidak"}`}
                    {ent.uangPisah?.applicable && " · Uang pisah"}
                  </p>
                  <p className="mt-1">Dasar: PP 35/2021 art. {selected?.articles.join(", ")}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={busy || !reasonCode || !joinDate || !separationDate}
                className="w-full"
              >
                {busy ? "Menghitung…" : "Pratinjau minimum legal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4" /> Bukti & hasil
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <p className="text-sm text-muted-foreground">
                Isi formulir dan jalankan pratinjau untuk melihat rincian komponen.
              </p>
            ) : preview.status === "blocked" ? (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <Ban className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Diblokir ({preview.blockedCode})</p>
                  <p>{preview.warnings[0] ?? "Outside normative window."}</p>
                  <p className="mt-1 text-muted-foreground">
                    Jendela normatif: {preview.rulesetEffectiveDate} s.d.{" "}
                    {preview.regulatoryStatus.status === "time_bounded"
                      ? preview.regulatoryStatus.blockingFrom
                      : "berlaku"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {preview.completeness.complete ? (
                    <Badge
                      variant="outline"
                      className="bg-success/15 text-success border-success/40"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Lengkap
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-warning/15 text-warning border-warning/40"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" /> Input belum lengkap
                    </Badge>
                  )}
                  <Badge variant="outline">Ruleset {preview.ruleVersion}</Badge>
                </div>

                <div className="space-y-1">
                  {preview.components.map((c) => (
                    <div key={c.code} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {c.label}
                        {c.kind === "contractual" && " (perjanjian)"}
                      </span>
                      <span className="font-medium">{fmtIdr(c.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Minimum legal</span>
                  <span>{fmtIdr(preview.statutoryMinimum)}</span>
                </div>

                {preview.warnings.map((w) => (
                  <p key={w} className="rounded-md bg-warning/10 p-2 text-xs text-warning">
                    {w}
                  </p>
                ))}
                {preview.complianceViolations.map((v) => (
                  <p
                    key={v.code}
                    className="rounded-md bg-destructive/10 p-2 text-xs text-destructive"
                  >
                    {v.code}: {v.message}
                  </p>
                ))}

                <details className="rounded-md bg-muted p-3 text-xs">
                  <summary className="cursor-pointer font-medium">
                    Jejak kalkulasi & dasar hukum
                  </summary>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {preview.calculationTrace.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                  <p className="mt-2 font-medium text-foreground">Dasar hukum</p>
                  <ul className="text-muted-foreground">
                    {preview.legalBasis.map((b) => (
                      <li key={b.instrument}>
                        {b.instrument}
                        {b.articles?.length ? ` art. ${b.articles.join(", ")}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>

                <Button
                  onClick={onFinalize}
                  disabled={
                    busy ||
                    preview.complianceViolations.length > 0 ||
                    !preview.completeness.complete
                  }
                  variant="secondary"
                  className="w-full"
                >
                  <FileLock2 className="mr-2 h-4 w-4" /> Rekam kasus (snapshot + hash)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kasus terekam</CardTitle>
        </CardHeader>
        <CardContent>
          {(casesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kasus pemutusan terekam.</p>
          ) : (
            <div className="space-y-2">
              {(casesQuery.data ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {c.employee_name}{" "}
                      <span className="text-muted-foreground">· {c.reason_code}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.separation_date} · ruleset {c.ruleset_version} · hash{" "}
                      {c.calculation_hash.slice(0, 12)}…
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.requires_legal_classification && (
                      <Badge
                        variant="outline"
                        className="bg-warning/15 text-warning border-warning/40"
                      >
                        Legal review
                      </Badge>
                    )}
                    {c.approved_at ? (
                      <Badge
                        variant="outline"
                        className="bg-success/15 text-success border-success/40"
                      >
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                    <span className="font-medium">{fmtIdr(c.statutory_minimum)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
