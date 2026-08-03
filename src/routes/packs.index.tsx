import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { listCatalogWithHealth, type CatalogEntry } from "@/lib/packs/catalog";

export const Route = createFileRoute("/packs/")({
  // SSR per request: the production gate depends on live health(), so this
  // loader must never be frozen into a static prerendered artifact (ADR-0032).
  loader: async () => ({ packs: await listCatalogWithHealth() }),
  head: () => ({
    meta: [
      { title: "Country Packs — Compliance coverage across SE Asia | UBoard Asia" },
      { name: "description", content: "Global compliance core plus country packs for Indonesia, Philippines and more. See which packs are in production and what is on the roadmap." },
      { property: "og:title", content: "Country Packs — Compliance coverage across SE Asia" },
      { property: "og:description", content: "One global core, independent country packs. Production, beta and roadmap coverage for Southeast Asia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PacksCatalog,
});

function PacksCatalog() {
  const { packs } = Route.useLoaderData() as { packs: CatalogEntry[] };
  const production = packs.filter((p) => p.tier === "production");
  const beta = packs.filter((p) => p.tier === "beta");
  const roadmap = packs.filter((p) => p.tier === "roadmap");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <header className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Coverage</span>
          <h1 className="mt-2 font-display text-4xl font-bold">Country Packs</h1>
          <p className="mt-3 text-muted-foreground">
            The global core never changes when a law does. Every jurisdiction ships as an
            independent, versioned and signed pack — validated at runtime before it goes live.
          </p>
        </header>

        <Group title="In production" sub="Signed, version 1.0+ and passing live health checks." items={production} linkable />
        <Group title="In validation" sub="Installed and running, not yet promoted to production." items={beta} />
        <Group title="Roadmap" sub="Planned jurisdictions." items={roadmap} />
      </main>
      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 font-display font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-accent" /> UBoard Asia
        </div>
      </footer>
    </div>
  );
}

function Group({ title, sub, items, linkable }: { title: string; sub: string; items: CatalogEntry[]; linkable?: boolean }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{sub}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {items.map((p) => (
          <Card key={p.code}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl">{p.flag}</div>
                  <h3 className="mt-2 font-display text-lg font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {p.installed ? `pack v${p.version} · ${p.rulesetVersion} · ${p.currency}` : `${p.currency} · planned`}
                  </p>
                </div>
                <Badge variant={p.tier === "production" ? "default" : "outline"}>{p.tier}</Badge>
              </div>
              {p.provides.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {p.provides.slice(0, 5).map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                </div>
              )}
              {linkable && (
                <Button asChild variant="outline" size="sm" className="mt-5 w-full">
                  <Link to="/packs/$country" params={{ country: p.code.toLowerCase() }}>
                    Open pack <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
