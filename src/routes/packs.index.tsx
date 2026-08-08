import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { ShieldCheck } from "lucide-react";
import { CountryPackCard, RoadmapPackCard } from "@/components/packs/CountryPackCard";
import type { CatalogEntry } from "@/lib/packs/catalog";
import { getPacksPageData } from "@/lib/packs/packs.functions";
import type { AvailablePack } from "@/lib/packs/onboarding-contract";

export const Route = createFileRoute("/packs/")({
  // SSR per request: the production gate depends on live health(), so this
  // loader must never be frozen into a static prerendered artifact (ADR-0032).
  // Availability comes from the same loader as onboarding (ADR-0033).
  loader: async () => getPacksPageData(),
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
  const { catalog, available } = Route.useLoaderData() as {
    catalog: CatalogEntry[];
    available: AvailablePack[];
  };
  const packs = catalog;
  const availableCodes = new Set(available.map((p) => p.countryCode));
  const production = packs.filter((p) => availableCodes.has(p.code.toUpperCase()));
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

        <Group title="Production" count={production.length} sub="Signed, version 1.0+ and passing live health checks.">
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {production.map((p) => <CountryPackCard key={p.code} pack={p} variant="production" />)}
          </div>
        </Group>

        <Group title="Validation" count={beta.length} sub="Installed and running, not yet promoted to production.">
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {beta.map((p) => <CountryPackCard key={p.code} pack={p} variant="validation" />)}
          </div>
        </Group>

        <Group title="Roadmap" count={roadmap.length} sub="Planned jurisdictions.">
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {roadmap.map((p) => <RoadmapPackCard key={p.code} pack={p} />)}
          </div>
        </Group>

      </main>
      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 font-display font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-accent" /> UBoard Asia
        </div>
      </footer>
    </div>
  );
}

function Group({ title, sub, count, children }: { title: string; sub: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{sub}</p>
      {children}
    </section>
  );
}
