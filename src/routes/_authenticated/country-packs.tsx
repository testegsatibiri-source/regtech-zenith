import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/country-packs")({
  head: () => ({
    meta: [
      { title: "Country Packs · UBoard Asia" },
      { name: "description", content: "Installed compliance country packs, engines and versions." },
    ],
  }),
  component: CountryPacksPage,
});

function CountryPacksPage() {
  const installed = CountryRuntime.list();

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header>
          <h1 className="font-display text-3xl font-bold">Country Packs</h1>
          <p className="text-sm text-muted-foreground">
            Installed via the Compliance SDK Country Runtime. Each pack ships its own manifest,
            semver and capability set. Core version <code className="rounded bg-muted px-1">2.0.0</code>.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {installed.map(({ pack, status, reason }) => {
            const m = pack.manifest;
            return (
              <Card key={m.country}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {m.name}
                      <Badge variant="outline">{m.country}</Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      v{m.version} · ruleset {m.rulesetVersion} · requires core {m.requiresCore}
                    </p>
                  </div>
                  {status === "installed" ? (
                    <Badge className="gap-1 bg-emerald-600"><CheckCircle2 className="h-3 w-3" /> installed</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {status}</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {reason && <p className="text-xs text-destructive">{reason}</p>}
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Capabilities</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.engines.length === 0 && (
                        <span className="text-xs text-muted-foreground">— none yet (stub) —</span>
                      )}
                      {m.engines.map((e) => (
                        <Badge key={e} variant="secondary">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Languages</p>
                    <p className="text-sm">{m.supportedLanguages.join(", ")}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
