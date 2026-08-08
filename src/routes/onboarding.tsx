import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createCompany, listCompanies } from "@/lib/data.functions";
import { getAvailableCountryPacks } from "@/lib/packs/packs.functions";
import { CountryPackSelector } from "@/components/packs/CountryPackSelector";
import type { AvailablePack } from "@/lib/packs/onboarding-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  loader: async () => {
    const companies = await listCompanies();
    if (companies.length > 0) throw redirect({ to: "/dashboard" });
    return { packs: (await getAvailableCountryPacks()) as AvailablePack[] };
  },
  head: () => ({
    meta: [
      { title: "Set up your company — UBoard Asia" },
      { name: "description", content: "Create your company and choose the country pack that governs its payroll and compliance rules." },
      { property: "og:title", content: "Set up your company — UBoard Asia" },
      { property: "og:description", content: "Choose a jurisdiction and start running compliant payroll." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { packs } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createCo = useServerFn(createCompany);

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !countryCode) return;
    setSaving(true);
    setError(null);
    try {
      await createCo({
        data: {
          name: name.trim(),
          legal_name: legalName.trim() || null,
          tax_id: taxId.trim() || null,
          country_code: countryCode,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      navigate({ to: "/dashboard" });
    } catch (e) {
      // Errors stay on this page — never bounce the user into a redirect loop.
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          UBoard<span className="text-accent">Asia</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your company</CardTitle>
            <p className="text-sm text-muted-foreground">
              The country pack you choose defines the payroll, tax and compliance rules applied to
              this company.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="co-name">Company name</Label>
              <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-legal">Legal name (optional)</Label>
              <Input id="co-legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-tax">Tax ID (optional)</Label>
              <Input id="co-tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} maxLength={64} />
            </div>

            <div className="space-y-2">
              <Label>Country pack</Label>
              <CountryPackSelector packs={packs} value={countryCode} onSelect={setCountryCode} />
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <Button className="w-full" onClick={submit} disabled={saving || !name.trim() || !countryCode}>
              Create company
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
