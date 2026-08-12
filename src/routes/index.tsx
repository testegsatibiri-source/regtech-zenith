import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Layers, Cpu, Activity, Bot, Globe2, ArrowRight, Zap, Lock, GitBranch, HeartPulse, Boxes, FileCheck2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountryPackCard, RoadmapPackCard } from "@/components/packs/CountryPackCard";
import type { CatalogEntry } from "@/lib/packs/catalog";
import { getPacksPageData } from "@/lib/packs/packs.functions";
import type { AvailablePack } from "@/lib/packs/onboarding-contract";
import { CORE_VERSION } from "@/sdk";

export const Route = createFileRoute("/")({
  // Availability is evaluated server-side, once per request, through the same
  // loader as /packs and onboarding (ADR-0033). Never classify packs in an
  // isomorphic loader: the browser has no installed runtime.
  loader: async () => getPacksPageData(),
  head: () => ({
    meta: [
      { title: "Global payroll compliance infrastructure | UBoard Asia" },
      { name: "description", content: "One global compliance core, independent signed country packs — payroll, tax and statutory compliance for enterprises operating across Southeast Asia." },
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
  const { catalog, available } = Route.useLoaderData() as {
    catalog: CatalogEntry[];
    available: AvailablePack[];
  };
  const availableCodes = new Set(available.map((p) => p.countryCode));
  const production = catalog.filter((p) => availableCodes.has(p.code.toUpperCase()));
  const upcoming = catalog.filter((p) => !availableCodes.has(p.code.toUpperCase()));
  const validation = upcoming.filter((p) => p.installed);
  const roadmap = upcoming.filter((p) => !p.installed);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden text-white">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/10">
              Global compliance infrastructure
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
              Payroll compliance infrastructure, built for every jurisdiction.
            </h1>
            <p className="mt-5 max-w-lg text-white/70">
              One secure global core. Independent, signed country packs. Payroll, tax and
              statutory compliance delivered as versioned engines — so a change in the law
              is a parameter release, not a migration project.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/packs">Explore Country Packs <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <a href="#contact">Talk to us</a>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <Card className="w-full max-w-sm border-white/10 bg-white/5 backdrop-blur">
              <CardContent className="flex flex-col items-center gap-4 p-8 text-white">
                <span className="text-sm text-white/60">Compliance Score</span>
                <ScoreGauge score={95} label="Audit readiness" />
                <div className="w-full space-y-2 text-sm">
                  <Signal ok text="Minimum wage floor respected" />
                  <Signal ok text="Statutory contributions enrolled" />
                  <Signal text="Tax ID missing on 3 employees" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border bg-muted/20 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            eyebrow="How it works"
            title="Three layers, cleanly separated"
            sub="The core never moves when a jurisdiction does. That separation is the product."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Step n="01" icon={Boxes} title="Global Core" desc="Companies, employees, payroll orchestration, audit trail and API — identical in every market." />
            <Step n="02" icon={Globe2} title="Country Pack" desc="A signed, versioned module carrying the tax, benefits and labour rules of one jurisdiction." />
            <Step n="03" icon={FileCheck2} title="Compliance evidence" desc="Every calculation is traced to the ruleset version that produced it, ready for inspection." />
          </div>
        </div>
      </section>

      {/* Global Core capabilities */}
      <section id="platform" className="mx-auto max-w-6xl px-4 py-20">
        <SectionTitle
          eyebrow="Global Core"
          title="One compliance core, independent country packs"
          sub="Legislative change becomes a config update, not a code migration."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Feature icon={Layers} title="Compliance Core" desc="Central compliance infrastructure for global payroll operations." />
          <Feature icon={Globe2} title="Employee lifecycle" desc="Manage employee events from onboarding to offboarding." />
          <Feature icon={Cpu} title="Payroll calculations" desc="Modular payroll calculation engines powered by country packs." />
          <Feature icon={Activity} title="Audit trails" desc="Secure records and compliance evidence for every transaction." />
          <Feature icon={Zap} title="API integrations" desc="Connect payroll workflows with enterprise systems." />
          <Feature icon={Bot} title="AI compliance monitoring" desc="Detect anomalies before they become compliance risks." />
        </div>
      </section>

      {/* Coverage */}
      <section id="coverage" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">Coverage</span>
              <h2 className="mt-2 font-display text-3xl font-bold">Compliance intelligence per jurisdiction</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Each Country Pack carries the local payroll rules, tax engines and statutory
                workflows of one market — connected to the same global core.
              </p>
              <p className="mt-3 text-sm font-medium">
                {production.length} {production.length === 1 ? "pack" : "packs"} in production ·{" "}
                {upcoming.length} in validation or roadmap
              </p>
            </div>
            <Badge variant="outline" className="font-mono">core v{CORE_VERSION}</Badge>
          </div>

          {production.length > 0 && (
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {production.map((p) => <CountryPackCard key={p.code} pack={p} />)}
            </div>
          )}

          {validation.length > 0 && (
            <>
              <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Validation</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                {validation.map((p) => <RoadmapPackCard key={p.code} pack={p} />)}
              </div>
            </>
          )}

          {roadmap.length > 0 && (
            <>
              <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Next markets</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                {roadmap.map((p) => <RoadmapPackCard key={p.code} pack={p} />)}
              </div>
            </>
          )}

          <Button asChild variant="outline" className="mt-10">
            <Link to="/packs">Explore all country packs <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Trust & architecture */}
      <section id="architecture" className="mx-auto max-w-6xl px-4 py-20">
        <SectionTitle
          eyebrow="Architecture & trust"
          title="Engineered, not assembled"
          sub="Every jurisdiction ships as an isolated artifact with its own lifecycle, signature and health gate."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Feature icon={Lock} title="Cryptographically signed packs" desc="Ed25519 signatures verified against a trust store before a pack is allowed to run." />
          <Feature icon={GitBranch} title="Versioned rulesets" desc="Pack version, ruleset version and interface version are recorded on every calculation." />
          <Feature icon={HeartPulse} title="Runtime health gates" desc="A degraded pack drops out of production visibility on the next request — no deploy required." />
          <Feature icon={Layers} title="Jurisdictional isolation" desc="Packs never call each other and never patch the core, so one market cannot destabilise another." />
        </div>
      </section>

      {/* Developers */}
      <section className="border-t border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            eyebrow="For developers"
            title="A compliance API your systems can call"
            sub="Versioned REST endpoints and a typed Country Pack SDK, documented and signed."
          />
          <div className="mt-10 flex justify-center gap-3">
            <Button asChild variant="outline"><Link to="/api-docs">Read the API docs</Link></Button>
            <Button asChild variant="ghost"><Link to="/packs">See pack contracts</Link></Button>
          </div>
        </div>
      </section>

      {/* Enterprise contact */}
      <section id="contact" className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h2 className="font-display text-3xl font-bold">
          Deploying payroll compliance across multiple jurisdictions?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          We work with enterprises and multi-country groups to onboard the global core and the
          jurisdictions they operate in. Tell us your markets and headcount, and our team will
          design the deployment with you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href="mailto:enterprise@uboardasia.com">Talk to our team</a>
          </Button>
          <Button asChild size="lg" variant="outline"><Link to="/packs">Review coverage</Link></Button>
        </div>
      </section>

      <SiteFooter packs={catalog} />
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

function Step({ n, icon: Icon, title, desc }: { n: string; icon: typeof Layers; title: string; desc: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <span className="font-mono text-xs text-muted-foreground">{n}</span>
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
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
