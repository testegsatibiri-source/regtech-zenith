import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PayrollCalculator } from "@/components/PayrollCalculator";
import { CountryFlag } from "@/components/packs/CountryFlag";
import { ArrowLeft } from "lucide-react";
import { getProductionPack, type CatalogEntry } from "@/lib/packs/catalog";
import { hasCalculator } from "@/lib/packs/calculators";
import { LocaleScope } from "@/lib/i18n";

export const Route = createFileRoute("/packs/$country/calculator")({
  loader: async ({ params }) => {
    const pack = await getProductionPack(params.country);
    if (!pack || !hasCalculator(pack.code)) throw notFound();
    return { pack };
  },
  head: ({ loaderData }) => {
    const p = (loaderData as { pack?: CatalogEntry } | undefined)?.pack;
    if (!p) {
      return { meta: [{ title: "Calculator unavailable | UBoard Asia" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${p.name} Payroll Calculator — Country Pack v${p.version} | UBoard Asia`;
    const description = `Gross-to-net payroll simulation for ${p.name}, computed by the ${p.name} Country Pack (${p.rulesetVersion}) running on the UBoard global compliance core.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: CalculatorNotFound,
  component: PackCalculator,
});

function PackCalculator() {
  const { pack } = Route.useLoaderData() as { pack: CatalogEntry };
  const packLang = pack.languages.find((l) => l !== "en") ?? pack.languages[0] ?? "en";

  return (
    <LocaleScope lang={packLang}>
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-12">
          <Link
            to="/packs/$country"
            params={{ country: pack.code.toLowerCase() }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {pack.name} Country Pack
          </Link>

          <header className="mt-6 flex items-center gap-4">
            <CountryFlag code={pack.code} name={pack.name} className="h-10 w-[3.75rem]" />
            <div>
              <h1 className="font-display text-3xl font-bold">{pack.name} Payroll Calculator</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Country Pack v{pack.version} · ruleset {pack.rulesetVersion} · {pack.currency}
              </p>
            </div>
          </header>

          <div className="mt-8">
            <PayrollCalculator />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Estimates for guidance only. Every rate and threshold is a versioned Country Pack parameter.
          </p>
        </main>
        <SiteFooter />
      </div>
    </LocaleScope>
  );
}

function CalculatorNotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">No calculator for this jurisdiction</h1>
        <p className="mt-3 text-muted-foreground">
          This country pack does not expose a public calculator yet.
        </p>
      </main>
    </div>
  );
}
