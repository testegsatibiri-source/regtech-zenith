import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { getProductionPack, type CatalogEntry } from "@/lib/packs/catalog";
import { CountryFlag } from "@/components/packs/CountryFlag";
import { LocaleScope } from "@/lib/i18n";

export const Route = createFileRoute("/packs/$country")({
  // SSR per request. The production gate re-evaluates health() on every
  // request, so a degraded pack stops being publicly navigable immediately
  // instead of waiting for the next build (ADR-0032).
  loader: async ({ params }) => {
    const pack = await getProductionPack(params.country);
    if (!pack) throw notFound();
    return { pack };
  },
  head: ({ loaderData }) => {
    const p = (loaderData as { pack?: CatalogEntry } | undefined)?.pack;
    if (!p) {
      return { meta: [{ title: "Pack unavailable | UBoard Asia" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${p.name} Country Pack — payroll & tax compliance | UBoard Asia`;
    const description = `${p.name} compliance pack v${p.version} (${p.rulesetVersion}): ${p.provides.join(", ")} engines, signed and health-checked at runtime.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: PackNotFound,
  component: PackDetail,
});

function PackDetail() {
  const { pack } = Route.useLoaderData() as { pack: CatalogEntry };
  // Each pack page is locked to the language defined for that jurisdiction:
  // the global shell language cannot alter this copy.
  const packLang = pack.languages.find((l) => l !== "en") ?? pack.languages[0] ?? "en";
  return (
    <LocaleScope lang={packLang}>
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <Link to="/packs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All country packs
        </Link>

        <header className="mt-6 flex items-start gap-4">
          <CountryFlag code={pack.code} name={pack.name} className="h-12 w-[4.5rem]" />
          <div>
            <h1 className="font-display text-4xl font-bold">{pack.name} Country Pack</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              pack v{pack.version} · ruleset {pack.rulesetVersion} · interface {pack.interfaceVersion} · {pack.currency}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>production</Badge>
              {pack.signed && <Badge variant="outline">signed · Ed25519</Badge>}
              <Badge variant="outline">health: {pack.health}</Badge>
            </div>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Engines</h2>
              <div className="mt-3 flex flex-wrap gap-1">
                {pack.provides.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Runtime guarantees</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  "Manifest validated at install time",
                  "Ed25519 signature verified against the trust store",
                  "Live health check gates public visibility",
                  `Languages: ${pack.languages.join(", ")}`,
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{t}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <div className="mt-10 flex gap-3">
          <Button asChild><Link to="/auth">Start with {pack.name}</Link></Button>
          <Button asChild variant="outline"><Link to="/calculator">Try the calculator</Link></Button>
        </div>
      </main>
      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 font-display font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-accent" /> UBoard Asia
        </div>
      </footer>
    </div>
    </LocaleScope>
  );
}

function PackNotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Pack not available</h1>
        <p className="mt-3 text-muted-foreground">
          This country pack either does not exist or has not been promoted to production yet.
        </p>
        <Button asChild className="mt-6"><Link to="/packs">Browse available packs</Link></Button>
      </main>
    </div>
  );
}
