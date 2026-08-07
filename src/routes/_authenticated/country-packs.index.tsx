import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Layers } from "lucide-react";
import { CORE_VERSION } from "@/sdk";
import { listCatalog, listCatalogWithHealth, type CatalogEntry } from "@/lib/packs/catalog";

export const Route = createFileRoute("/_authenticated/country-packs/")({
  head: () => ({
    meta: [
      { title: "Country Packs · UBoard Asia" },
      { name: "description", content: "Global compliance core and every installed country pack with tier, version, signature and live health." },
    ],
  }),
  component: CountryPacksListPage,
});

function CountryPacksListPage() {
  const [packs, setPacks] = useState<CatalogEntry[]>(() => listCatalog());

  useEffect(() => {
    let cancelled = false;
    listCatalogWithHealth().then((p) => { if (!cancelled) setPacks(p); });
    return () => { cancelled = true; };
  }, []);

  const groups: Array<[string, CatalogEntry["tier"]]> = [
    ["In production", "production"],
    ["In validation", "beta"],
    ["Roadmap", "roadmap"],
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <header>
          <h1 className="font-display text-3xl font-bold">Country Packs</h1>
          <p className="text-sm text-muted-foreground">
            One global core, many jurisdictions. Packs are classified by runtime status, semver,
            signature and live health — never by hand.
          </p>
        </header>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-4 p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-6 w-6" />
            </span>
            <div className="min-w-[200px] flex-1">
              <h2 className="font-display text-lg font-semibold">Global Core</h2>
              <p className="text-sm text-muted-foreground">
                Employees, payroll orchestration, compliance score, audit and API layer — jurisdiction agnostic.
              </p>
            </div>
            <Badge variant="outline" className="font-mono">core v{CORE_VERSION}</Badge>
          </CardContent>
        </Card>

        {groups.map(([label, tier]) => {
          const items = packs.filter((p) => p.tier === tier);
          if (items.length === 0) return null;
          return (
            <section key={tier} className="space-y-3">
              <h2 className="font-display text-lg font-semibold">{label}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((p) => (
                  <Card key={p.code}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                            <span className="text-xl">{p.flag}</span> {p.name}
                            <Badge variant="outline">{p.code}</Badge>
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {p.installed
                              ? `pack v${p.version} · ruleset ${p.rulesetVersion} · ${p.currency}`
                              : `${p.currency} · not implemented yet`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={p.tier === "production" ? "default" : "outline"}>{p.tier}</Badge>
                          {p.signed && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <ShieldCheck className="h-3 w-3" /> signed
                            </span>
                          )}
                        </div>
                      </div>

                      {p.provides.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {p.provides.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                        </div>
                      )}

                      {p.blockers.length > 0 && p.installed && (
                        <ul className="mt-3 space-y-0.5 text-xs text-warning">
                          {p.blockers.map((b) => <li key={b}>• {b}</li>)}
                        </ul>
                      )}

                      {p.installed && (
                        <Button asChild size="sm" variant="outline" className="mt-4">
                          <Link to="/country-packs/$country" params={{ country: p.code.toLowerCase() }}>
                            Open details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
