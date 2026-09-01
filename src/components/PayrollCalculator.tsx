import { useMemo, useState } from "react";
import { buildPayslip, calculateThr } from "@/lib/engines/indonesia";
import { MARITAL_STATUS } from "@/lib/countryPacks";
import { formatIDR } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "net" | "cost";
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span
        className={
          tone === "net"
            ? "font-display text-lg font-bold text-success"
            : tone === "cost"
              ? "font-display font-semibold text-primary"
              : strong
                ? "font-semibold"
                : "tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function PayrollCalculator() {
  const { t } = useI18n();
  const [base, setBase] = useState(10000000);
  const [allow, setAllow] = useState(0);
  const [status, setStatus] = useState("TK/0");
  const [npwp, setNpwp] = useState(true);
  const [months, setMonths] = useState(12);

  const slip = useMemo(
    () =>
      buildPayslip({ baseSalary: base, allowances: allow, maritalStatus: status, hasNpwp: npwp }),
    [base, allow, status, npwp],
  );
  const thr = useMemo(
    () => calculateThr({ monthlySalary: base + allow, monthsOfService: months }),
    [base, allow, months],
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("calc.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("calc.sub")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("calc.base")}</Label>
            <Input
              type="number"
              value={base}
              onChange={(e) => setBase(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("calc.allow")}</Label>
            <Input
              type="number"
              value={allow}
              onChange={(e) => setAllow(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("calc.status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARITAL_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="npwp-toggle">{t("calc.npwp")}</Label>
            <Switch id="npwp-toggle" checked={npwp} onCheckedChange={setNpwp} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("calc.months")}</Label>
            <Input
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            TER category <span className="font-semibold text-foreground">{slip.tax.category}</span>{" "}
            · rate {(slip.tax.rate * 100).toFixed(2)}%
          </p>
        </CardHeader>
        <CardContent>
          <Row label={t("calc.gross")} value={formatIDR(slip.gross)} strong />
          <Row label={t("calc.tax")} value={"− " + formatIDR(slip.tax.tax)} />
          <Row label={t("calc.bpjsEmp")} value={"− " + formatIDR(slip.bpjs.employee.total)} />
          <Row label={t("calc.net")} value={formatIDR(slip.net)} tone="net" />
          <div className="my-3 h-px bg-border" />
          <Row label={t("calc.bpjsEmployer")} value={formatIDR(slip.bpjs.employer.total)} />
          <Row label={t("calc.employerCost")} value={formatIDR(slip.employerCost)} tone="cost" />
          <div className="my-3 h-px bg-border" />
          <Row
            label={t("calc.thr")}
            value={thr.eligible ? formatIDR(thr.amount) + (thr.prorated ? " (pro-rata)" : "") : "—"}
            strong
          />
        </CardContent>
      </Card>
    </div>
  );
}
