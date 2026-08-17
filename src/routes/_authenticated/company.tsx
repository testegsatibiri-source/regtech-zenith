import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CheckCircle2, AlertTriangle } from "lucide-react";
import { listCompanies, updateCompanyStatutory } from "@/lib/data.functions";
import { useCompany } from "@/lib/companyContext";
import { useActivePack } from "@/lib/packs/useActivePack";
import { terminologyFor } from "@/lib/packs/terminology";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({
    meta: [
      { title: "Employer registry — UBoard Asia" },
      { name: "description", content: "Register the statutory employer numbers required to file payroll remittances in your jurisdiction." },
      { property: "og:title", content: "Employer registry — UBoard Asia" },
      { property: "og:description", content: "Statutory employer identifiers that back every payroll filing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompanyRegistry,
});

type Row = { id: string; name: string; statutory_metadata?: Record<string, string> | null };

function CompanyRegistry() {
  const { companyId } = useCompany();
  const pack = useActivePack();
  const t = terminologyFor(pack.code);
  const fetchCompanies = useServerFn(listCompanies);
  const save = useServerFn(updateCompanyStatutory);
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => fetchCompanies() as Promise<Row[]>,
  });
  const company = companies.find((c) => c.id === companyId) ?? null;

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues((company?.statutory_metadata as Record<string, string>) ?? {});
  }, [company?.id, company?.statutory_metadata]);

  if (!companyId) return <p className="text-muted-foreground">Create a company first.</p>;

  const filled = t.employerIdentifiers.filter((f) => (values[f.key] ?? "").trim().length > 0).length;
  const complete = filled === t.employerIdentifiers.length;

  async function submit() {
    setSaving(true);
    try {
      await save({ data: { companyId: companyId!, statutory_metadata: values } });
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Employer registry saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Employer registry</h1>
        <p className="text-muted-foreground">
          Statutory employer numbers for {pack.name}. Every remittance file is rejected without them.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> {company?.name ?? "Company"}
          </CardTitle>
          <Badge className={"border-0 " + (complete ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
            {complete ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <AlertTriangle className="mr-1 h-3.5 w-3.5" />}
            {filled}/{t.employerIdentifiers.length} registered
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {t.employerIdentifiers.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`emp-${f.key}`}>{f.label}</Label>
              <Input
                id={`emp-${f.key}`}
                value={values[f.key] ?? ""}
                maxLength={64}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save registry"}</Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        These identifiers are a prerequisite for statutory filings (Phase 4). They are stored per
        jurisdiction and validated against the formats published by the local authorities.
      </p>
    </div>
  );
}
