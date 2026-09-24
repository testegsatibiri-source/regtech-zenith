// H24 Etapa C — Philippines separation panel (Labor Code arts. 297-299).
// Mirrors the Indonesia panel in shape, but reads grounds and final pay from
// the PH pack runtime. Procedural duties (twin notice, COE, final pay window)
// are shown as a checklist — the pack computes amounts, not legal advice.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Calculator, CheckCircle2, Scale } from "lucide-react";
import { listSeparationGrounds, computeFinalPay } from "@/lib/separation.functions";
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

const fmtPhp = (n: number) =>
  n.toLocaleString("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

type Result = Awaited<ReturnType<typeof computeFinalPay>>;

export function PhSeparationPanel({ companyId }: { companyId: string }) {
  const groundsFn = useServerFn(listSeparationGrounds);
  const compute = useServerFn(computeFinalPay);

  const [fullName, setFullName] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [separationDate, setSeparationDate] = useState("");
  const [yearsOfService, setYearsOfService] = useState("");
  const [groundCode, setGroundCode] = useState("");
  const [unusedLeaveDays, setUnusedLeaveDays] = useState("");
  const [thirteenthAmount, setThirteenthAmount] = useState("");
  const [deductions, setDeductions] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const groundsQuery = useQuery({
    queryKey: ["separation-grounds", "PH"],
    queryFn: () => groundsFn({ data: { country: "PH" } }),
  });

  const grounds = groundsQuery.data ?? [];
  const selected = grounds.find((g) => g.code === groundCode);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const res = await compute({
        data: {
          companyId,
          employeeId: crypto.randomUUID(),
          fullName: fullName || "Employee",
          baseSalary: Number(baseSalary || 0),
          joinDate: joinDate || "2020-01-01",
          separationDate: separationDate || new Date().toISOString().split("T")[0],
          groundCode: selected.code,
          yearsOfService: Number(yearsOfService || 0),
          unusedLeaveDays: unusedLeaveDays ? Number(unusedLeaveDays) : undefined,
          thirteenthAmount: thirteenthAmount ? Number(thirteenthAmount) : undefined,
          deductions: deductions ? Number(deductions) : undefined,
        },
      });
      setResult(res);
      if (!res.complete) toast.warning("Final pay is incomplete — see missing items");
      else toast.success("Final pay computed");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Compute final pay (Labor Code arts. 297-299)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly basic salary (PHP)</Label>
                <Input
                  type="number"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  placeholder="30000"
                />
              </div>
              <div className="space-y-2">
                <Label>Date hired</Label>
                <Input
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Separation date</Label>
                <Input
                  type="date"
                  value={separationDate}
                  onChange={(e) => setSeparationDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Years of service</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={yearsOfService}
                  onChange={(e) => setYearsOfService(e.target.value)}
                  placeholder="3.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Unused SIL days</Label>
                <Input
                  type="number"
                  value={unusedLeaveDays}
                  onChange={(e) => setUnusedLeaveDays(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Ground for separation</Label>
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
                <Label>13th month accrued</Label>
                <Input
                  type="number"
                  value={thirteenthAmount}
                  onChange={(e) => setThirteenthAmount(e.target.value)}
                  placeholder="12500"
                />
              </div>
              <div className="space-y-2">
                <Label>Deductions (loans/advances)</Label>
                <Input
                  type="number"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {selected && (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Procedural duties</p>
                <ul className="mt-1 space-y-1">
                  <li>
                    • Twin-notice rule:{" "}
                    {selected.requiresTwinNotice
                      ? "required for this ground (notice to explain + notice of decision)"
                      : "not required for this ground; 30-day notice to the employee and DOLE applies to authorized causes"}
                  </li>
                  <li>• Certificate of Employment: issue within 3 days of the request</li>
                  <li>• Final pay: release within 30 days of separation (DOLE LA 06-20)</li>
                  {selected.monthsPerYear ? (
                    <li>
                      • Separation pay: {selected.monthsPerYear} month(s) of pay per year of service
                    </li>
                  ) : null}
                </ul>
              </div>
            )}

            <Button type="submit" disabled={busy || !selected} className="w-full">
              {busy ? "Computing…" : "Compute final pay"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Fill the form and compute to see the breakdown.
            </p>
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
                    <span className="font-medium">{fmtPhp(c.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total</span>
                <span>{fmtPhp(result.total)}</span>
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
  );
}
