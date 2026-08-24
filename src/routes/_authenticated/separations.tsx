import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Calculator, UserX, AlertCircle, CheckCircle2 } from "lucide-react";
import { useCompany } from "@/lib/companyContext";
import { useActivePack } from "@/lib/packs/useActivePack";
import { listSeparationGrounds, computeFinalPay } from "@/lib/separation.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/separations")({
  component: SeparationsPage,
  head: () => ({
    meta: [
      { title: "Separations & Final Pay — UBoard Compliance OS" },
      {
        name: "description",
        content:
          "Compute offboarding final pay, separation pay and notice requirements under local labor code.",
      },
      { property: "og:title", content: "Separations & Final Pay — UBoard Compliance OS" },
      {
        property: "og:description",
        content: "Offboarding final pay, separation pay and statutory notice requirements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function SeparationsPage() {
  const { companyId, company } = useCompany();
  const activePack = useActivePack();
  const groundsFn = useServerFn(listSeparationGrounds);
  const compute = useServerFn(computeFinalPay);

  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [separationDate, setSeparationDate] = useState("");
  const [yearsOfService, setYearsOfService] = useState("");
  const [groundCode, setGroundCode] = useState("");
  const [unusedLeaveDays, setUnusedLeaveDays] = useState("");
  const [thirteenthAmount, setThirteenthAmount] = useState("");
  const [deductions, setDeductions] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof compute>> | null>(null);
  const [busy, setBusy] = useState(false);

  const groundsQuery = useQuery({
    queryKey: ["separation-grounds", activePack.code],
    queryFn: () => groundsFn({ data: { country: activePack.code } }),
    enabled: Boolean(activePack.code),
  });

  const grounds = groundsQuery.data ?? [];
  const selected = grounds.find((g) => g.code === groundCode);

  const unsupported = groundsQuery.isSuccess && grounds.length === 0;

  if (!companyId) return <p className="text-muted-foreground">Create a company first.</p>;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const res = await compute({
        data: {
          companyId,
          employeeId: employeeId || crypto.randomUUID(),
          fullName: fullName || "Employee",
          baseSalary: Number(baseSalary),
          joinDate: joinDate || "2020-01-01",
          separationDate: separationDate || new Date().toISOString().split("T")[0],
          groundCode: selected.code,
          yearsOfService: Number(yearsOfService),
          unusedLeaveDays: unusedLeaveDays ? Number(unusedLeaveDays) : undefined,
          thirteenthAmount: thirteenthAmount ? Number(thirteenthAmount) : undefined,
          deductions: deductions ? Number(deductions) : undefined,
        },
      });
      setResult(res);
      if (!res.complete) {
        toast.warning("Final pay is incomplete — see missing items");
      } else {
        toast.success("Final pay computed");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserX className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Separations & Final Pay</h1>
          <p className="text-muted-foreground">
            {company?.name} · {activePack.name}
          </p>
        </div>
      </div>

      {unsupported ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" /> Not available for {activePack.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This country pack does not ship an offboarding / final pay engine yet. Switch to a
            country pack that provides the separation capability (e.g. Philippines) to compute
            final pay and statutory notice requirements.
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Compute final pay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
                </div>
                <div className="space-y-2">
                  <Label>Monthly basic salary</Label>
                  <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="30000" />
                </div>
                <div className="space-y-2">
                  <Label>Join date</Label>
                  <Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Separation date</Label>
                  <Input type="date" value={separationDate} onChange={(e) => setSeparationDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Years of service</Label>
                  <Input type="number" step="0.1" value={yearsOfService} onChange={(e) => setYearsOfService(e.target.value)} placeholder="3.5" />
                </div>
                <div className="space-y-2">
                  <Label>Ground</Label>
                  <Select value={groundCode} onValueChange={setGroundCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ground" />
                    </SelectTrigger>
                    <SelectContent>
                      {grounds.map((g) => (
                        <SelectItem key={g.code} value={g.code}>
                          {g.title} ({g.article})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unused SIL days</Label>
                  <Input type="number" value={unusedLeaveDays} onChange={(e) => setUnusedLeaveDays(e.target.value)} placeholder="5" />
                </div>
                <div className="space-y-2">
                  <Label>13th month accrued</Label>
                  <Input type="number" value={thirteenthAmount} onChange={(e) => setThirteenthAmount(e.target.value)} placeholder="12500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deductions (loans/advances)</Label>
                <Input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} placeholder="0" />
              </div>
              <Button type="submit" disabled={busy || !selected} className="w-full">
                {busy ? "Computing..." : "Compute final pay"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <p className="text-sm text-muted-foreground">Fill the form and compute to see the breakdown.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.complete ? (
                    <Badge variant="outline" className="bg-success/15 text-success border-success/40">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-warning/15 text-warning border-warning/40">
                      <AlertCircle className="mr-1 h-3 w-3" /> Incomplete
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">Due by {result.dueDate}</span>
                </div>
                <div className="space-y-1">
                  {result.components.map((c) => (
                    <div key={c.code} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className="font-medium">{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{result.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {result.missing.length > 0 && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium">Missing inputs</p>
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {result.missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
