import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { submitPilotRequest } from "@/lib/pilot.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const employeeRanges = ["1-50", "51-200", "201-1000", "1000+"] as const;
const roles = [
  "HR Executive",
  "Finance Director",
  "Legal & Compliance Officer",
  "Accounting Partner",
] as const;

export function IdPilotForm() {
  const { t } = useI18n();
  const submit = useServerFn(submitPilotRequest);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    companyName: "",
    employeeRange: "",
    role: "",
    consent: false,
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const canSubmit =
    form.fullName.trim() &&
    form.email.trim() &&
    form.companyName.trim() &&
    form.employeeRange &&
    form.role &&
    form.consent;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    try {
      await submit({
        data: {
          fullName: form.fullName,
          email: form.email,
          companyName: form.companyName,
          employeeRange: form.employeeRange as (typeof employeeRanges)[number],
          role: form.role as (typeof roles)[number],
          consent: form.consent,
        },
      });
      setStatus("success");
      setForm({ fullName: "", email: "", companyName: "", employeeRange: "", role: "", consent: false });
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="form" className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-3xl font-semibold tracking-tight">{t("id.cta.title")}</h2>
          <p className="text-muted-foreground">{t("id.cta.body")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("id.form.submit")}</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "success" ? (
              <p className="text-center text-green-600">{t("id.form.success")}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("id.form.fullName")}</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("id.form.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t("id.form.companyName")}</Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={(e) => setForm((s) => ({ ...s, companyName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("id.form.employeeRange")}</Label>
                  <Select
                    value={form.employeeRange}
                    onValueChange={(v) => setForm((s) => ({ ...s, employeeRange: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rentang" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeRanges.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("id.form.role")}</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((s) => ({ ...s, role: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={form.consent}
                    onCheckedChange={(c) => setForm((s) => ({ ...s, consent: c === true }))}
                    required
                  />
                  <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
                    {t("id.form.consent")}{" "}
                    <a href="/id/kebijakan-privasi" className="text-primary underline">
                      {t("id.form.consentLink")}
                    </a>
                    .
                  </Label>
                </div>
                {status === "error" && (
                  <p className="text-sm text-destructive">{t("id.form.error")}</p>
                )}
                <Button type="submit" className="w-full" disabled={!canSubmit || status === "submitting"}>
                  {t("id.form.submit")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
