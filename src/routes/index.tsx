import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck, Layers, Cpu, Activity, Bot, Globe2, Check, ArrowRight, Zap, FileWarning,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { listCatalogWithHealth, type CatalogEntry } from "@/lib/packs/catalog";
import { CORE_VERSION } from "@/sdk";

export const Route = createFileRoute("/")({
  // SSR per request — the production tier depends on live health().
  loader: async () => ({ packs: await listCatalogWithHealth() }),
  head: () => ({
    meta: [
      { title: "Global payroll compliance infrastructure | UBoard" },
      { name: "description", content: "One global compliance core, independent signed country packs — payroll, tax and statutory compliance across Southeast Asia." },
      { property: "og:title", content: "Global compliance infrastructure with independent country packs" },
      { property: "og:description", content: "One secure core, independent signed country packs. Legislative change becomes a config update, not a code migration." },
      { property: "og:url", content: "https://uboardasia.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://uboardasia.com/" }],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const { packs } = Route.useLoaderData() as { packs: CatalogEntry[] };
  const production = packs.filter((p) => p.tier === "production");
  const upcoming = packs.filter((p) => p.tier !== "production");
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden text-white">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/10">{t("hero.badge")}</Badge>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">{t("hero.title")}</h1>
            <p className="mt-5 max-w-lg text-white/70">{t("hero.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/packs">{t("hero.ctaPacks")} <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link to="/auth">{t("hero.ctaCore")}</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <Card className="w-full max-w-sm border-white/10 bg-white/5 backdrop-blur">
              <CardContent className="flex flex-col items-center gap-4 p-8 text-white">
                <span className="text-sm text-white/60">{t("score.title")}</span>
                <ScoreGauge score={95} label={t("score.audit")} />
                <div className="w-full space-y-2 text-sm">
                  <Signal ok text={t("hero.signal1")} />
                  <Signal ok text={t("hero.signal2")} />
                  <Signal text={t("hero.signal3")} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Architecture layers */}
      <section id="product" className="mx-auto max-w-6xl px-4 py-20">
        <SectionTitle
          eyebrow="Global Core"
          title="One compliance core, independent country packs"
          sub="Legislative change becomes a config update, not a code migration. The core never moves when a jurisdiction does."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Feature icon={Layers} title="Compliance Core" desc="Central compliance infrastructure for global payroll operations." />
          <Feature icon={Globe2} title="Employee lifecycle" desc="Manage employee events from onboarding to offboarding." />
          <Feature icon={Cpu} title="Payroll calculations" desc="Modular payroll calculation engines powered by country packs." />
          <Feature icon={Activity} title="Audit trails" desc="Secure records and compliance evidence for every transaction." />
          <Feature icon={Zap} title="API integrations" desc="Connect payroll workflows with enterprise systems." />
          <Feature icon={Bot} title="AI compliance monitoring" desc="Detect anomalies before they become compliance risks." />
        </div>

        {/* Global core + country packs */}
        <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold">Compliance intelligence for every jurisdiction</h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Each Country Pack contains local payroll rules, tax engines, statutory requirements
                and compliance workflows — connected to the same global core.
              </p>
              <p className="mt-2 text-sm font-medium">
                {production.length} {production.length === 1 ? "pack" : "packs"} in production · {upcoming.length} in validation or roadmap
              </p>
            </div>
            <Badge variant="outline" className="font-mono">core v{CORE_VERSION}</Badge>
          </div>

          {production.length > 0 && (
            <>
              <h4 className="mt-8 text-sm font-semibold uppercase tracking-wider text-accent">Production</h4>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {production.map((p) => (
                  <CountryPackCard key={p.code} pack={p} variant="production" />
                ))}
              </div>
            </>
          )}

          {validation.length > 0 && (
            <>
              <h4 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Validation</h4>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                {validation.map((p) => (
                  <CountryPackCard key={p.code} pack={p} variant="validation" />
                ))}
              </div>
            </>
          )}

          {roadmap.length > 0 && (
            <>
              <h4 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Next markets</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {roadmap.map((p) => (
                  <CountryPackCard key={p.code} pack={p} variant="roadmap" />
                ))}
              </div>
            </>
          )}

          <Button asChild variant="outline" className="mt-8">
            <Link to="/packs">Explore all country packs <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>


      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            eyebrow="Pricing"
            title="Hybrid: platform base + per-employee, per-month"
            sub="Scales with your headcount, never with your payroll value. Advanced compliance & API sold as high-margin add-ons."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <PriceCard
              name="Starter"
              base="$50/mo"
              per="$2 / employee / mo"
              features={["Global Core + companies & branches", "One Country Pack included", "Payroll close with statutory engines", "Basic Compliance Score"]}
            />
            <PriceCard
              highlight
              name="Growth"
              base="$150/mo"
              per="$3.50 / employee / mo"
              features={["Everything in Starter", "Additional country packs on demand", "AI Compliance module (add-on)", "Predictive overtime & anomaly alerts", "Multi-branch dashboards", "Priority support"]}
            />
            <PriceCard
              name="API / Enterprise"
              base="from $300/mo"
              per="10,000 calc API calls"
              features={["Standalone calculation API endpoints", "For SAP / Workday / SuccessFactors", "Volume-based API billing", "SLA & dedicated Country Packs"]}
            />
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
            <FileWarning className="mr-1 inline h-4 w-4" />
            AI Compliance add-on: +20–30% of monthly invoice, or $1/employee — cheaper than a single labour-inspection fine.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4">
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-accent" /> UBoard Asia
          </div>
          <p>Compliance & Payroll as a Service — Southeast Asia.</p>
        </div>
      </footer>
    </div>
  );
}

function Signal({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5">
      <span className={"h-2 w-2 rounded-full " + (ok ? "bg-[oklch(0.7_0.15_155)]" : "bg-[oklch(0.78_0.16_75)]")} />
      <span className="text-white/80">{text}</span>
    </div>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</span>
      <h2 className="mt-2 text-3xl font-bold">{title}</h2>
      <p className="mt-3 text-muted-foreground">{sub}</p>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Layers; title: string; desc: string }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}

function PriceCard({ name, base, per, features, highlight }: { name: string; base: string; per: string; features: string[]; highlight?: boolean }) {
  return (
    <Card className={highlight ? "relative border-accent shadow-lg ring-1 ring-accent/40" : ""}>
      {highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Most popular</Badge>}
      <CardContent className="p-6">
        <h3 className="font-display text-lg font-semibold">{name}</h3>
        <div className="mt-3">
          <span className="font-display text-3xl font-bold">{base}</span>
          <span className="text-sm text-muted-foreground"> + {per}</span>
        </div>
        <ul className="mt-5 space-y-2.5 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-6 w-full" variant={highlight ? "default" : "outline"}>
          <Link to="/auth">Get started</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
