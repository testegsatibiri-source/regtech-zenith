import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CountryRuntime, type HealthReport } from "@/sdk";
import "@/sdk/bootstrap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Activity, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/country-packs/$country")({
  loader: ({ params }) => {
    const code = params.country.toUpperCase();
    const rec = CountryRuntime.list().find((r) => r.pack.manifest.country === code);
    if (!rec) throw notFound();
    return { code };
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.country.toUpperCase()} Country Pack · UBoard Asia` },
      { name: "description", content: "Manifest, engines, events, validator report and live health for this installed country pack." },
    ],
  }),
  notFoundComponent: PackNotInstalled,
  component: CountryPackDetailPage,
});

function PackNotInstalled() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-2xl font-bold">Pack not installed</h1>
      <p className="mt-2 text-sm text-muted-foreground">This country pack is not present in the runtime.</p>
      <Button asChild className="mt-4"><Link to="/country-packs">Back to packs</Link></Button>
    </div>
  );
}

function CountryPackDetailPage() {
  const { code } = Route.useLoaderData() as { code: string };
  const installed = CountryRuntime.list().filter((r) => r.pack.manifest.country === code);
  const [health, setHealth] = useState<Record<string, HealthReport | { status: "loading" | "error"; checks: never[] }>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const rec of installed) {
        if (rec.status !== "installed" && rec.status !== "degraded") continue;
        try {
          const h = await CountryRuntime.health(rec.pack.manifest.country);
          if (!cancelled) setHealth((s) => ({ ...s, [rec.pack.manifest.country]: h }));
        } catch {
          if (!cancelled) setHealth((s) => ({ ...s, [rec.pack.manifest.country]: { status: "error", checks: [] } }));
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header>
          <Link to="/country-packs" className="text-xs text-muted-foreground hover:text-foreground">
            &larr; All country packs
          </Link>
          <h1 className="font-display text-3xl font-bold">
            {installed[0]?.pack.manifest.name ?? code} Pack
          </h1>
          <p className="text-sm text-muted-foreground">
            Manifest, capabilities, event contract, validator report and live health as resolved by
            the Compliance SDK Country Runtime.
          </p>
        </header>

        <div className="grid gap-4">
          {installed.map(({ pack, status, reason, validation }) => {
            const m = pack.manifest;
            const h = health[m.country];
            return (
              <Card key={m.country}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {m.name}
                      <Badge variant="outline">{m.country}</Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      pack v{m.version} · ruleset {m.rulesetVersion} · requires core {m.requiresCore}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {reason && (
                    <p className={"text-xs " + (status === "degraded" ? "text-warning" : "text-destructive")}>
                      {reason}
                    </p>
                  )}

                  <Section title="Provides">
                    {m.provides.length === 0
                      ? <span className="text-xs text-muted-foreground">— none yet (stub) —</span>
                      : m.provides.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                  </Section>

                  {(m.requires?.length ?? 0) > 0 && (
                    <Section title="Requires">
                      {m.requires!.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                    </Section>
                  )}

                  {(m.events?.emits?.length || m.events?.consumes?.length) ? (
                    <Section title="Events">
                      {m.events!.emits?.map((e) => (
                        <Badge key={"e" + e} className="border-0 bg-primary/10 text-primary">↑ {e}</Badge>
                      ))}
                      {m.events!.consumes?.map((e) => (
                        <Badge key={"c" + e} className="border-0 bg-accent/10 text-accent">↓ {e}</Badge>
                      ))}
                    </Section>
                  ) : null}

                  {(m.features?.length ?? 0) > 0 && (
                    <Section title="Features">
                      {m.features!.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}
                    </Section>
                  )}

                  {(m.permissions?.length ?? 0) > 0 && (
                    <Section title="Permissions (declarative)">
                      {m.permissions!.map((p) => (
                        <Badge key={p} className="border-0 bg-muted text-muted-foreground">
                          <ShieldCheck className="mr-1 h-3 w-3" />{p}
                        </Badge>
                      ))}
                    </Section>
                  )}

                  <Section title="Provider versions">
                    {Object.entries(pack.providers).map(([key, prov]) => (
                      <Badge key={key} variant="outline" className="font-mono text-[10px]">
                        {key}@{(prov as { version?: string })?.version ?? "?"}
                      </Badge>
                    ))}
                  </Section>

                  {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                    <div className="rounded-md border border-border p-2">
                      <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                        Validator report
                      </p>
                      {validation.errors.map((e, i) => (
                        <div key={"e" + i} className="flex items-start gap-1 text-xs text-destructive">
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0" /> {e}
                        </div>
                      ))}
                      {validation.warnings.map((w, i) => (
                        <div key={"w" + i} className="flex items-start gap-1 text-xs text-warning">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-md border border-border p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                        <Activity className="mr-1 inline h-3 w-3" /> Health
                      </p>
                      <HealthBadge status={h?.status ?? "loading"} />
                    </div>
                    {h && "checks" in h && h.checks.length > 0 ? (
                      <ul className="space-y-0.5 text-xs">
                        {h.checks.map((c, i) => (
                          <li key={i} className="flex items-start gap-1">
                            {c.ok
                              ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                              : <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />}
                            <span className="font-mono text-[11px]">{c.name}</span>
                            {c.message && <span className="text-muted-foreground">— {c.message}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">Running…</p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-6 text-[11px]"
                      onClick={async () => {
                        const r = await CountryRuntime.health(m.country);
                        setHealth((s) => ({ ...s, [m.country]: r }));
                      }}
                    >Re-check</Button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Languages: {m.supportedLanguages.join(", ")}</span>
                    {m.signature ? (
                      <Badge variant="outline" className="text-[10px]">
                        signed · {m.signature.publisher}
                      </Badge>
                    ) : (
                      <span>unsigned</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "installed") {
    return <Badge className="gap-1 bg-emerald-600 text-white"><CheckCircle2 className="h-3 w-3" /> installed</Badge>;
  }
  if (status === "degraded") {
    return <Badge className="gap-1 bg-warning text-warning-foreground"><AlertTriangle className="h-3 w-3" /> degraded</Badge>;
  }
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {status}</Badge>;
}

function HealthBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ok: "bg-success/15 text-success",
    warn: "bg-warning/15 text-warning",
    error: "bg-destructive/15 text-destructive",
    loading: "bg-muted text-muted-foreground",
  };
  return <Badge className={"border-0 " + (map[status] ?? "")}>{status}</Badge>;
}
