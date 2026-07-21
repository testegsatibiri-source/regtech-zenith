import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPacks, getPackDetail, runPackHealth } from "@/lib/platform/api.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_platform/packs")({
  component: PacksPage,
});

function PacksPage() {
  const listFn = useServerFn(listPacks);
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "packs"],
    queryFn: () => listFn(),
  });
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Country Packs</h1>
        <p className="text-muted-foreground">Runtime-registered packs with their governance metadata.</p>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((p) => (
            <Card key={p.country} className="cursor-pointer transition-colors hover:border-primary" onClick={() => setSelected(p.country)}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>{p.name}</CardTitle>
                  <div className="mt-1 text-xs text-muted-foreground font-mono">
                    {p.country} · v{p.version} · ruleset {p.rulesetVersion}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {p.provides.map((c) => (
                    <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
                  ))}
                </div>
                {p.reason ? <p className="text-xs text-destructive">{p.reason}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected ? <PackDetailPanel country={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    installed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    degraded: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    incompatible: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return <Badge variant="outline" className={tone[status] ?? ""}>{status}</Badge>;
}

function PackDetailPanel({ country, onClose }: { country: string; onClose: () => void }) {
  const detailFn = useServerFn(getPackDetail);
  const healthFn = useServerFn(runPackHealth);
  const { data } = useQuery({
    queryKey: ["platform", "pack", country],
    queryFn: () => detailFn({ data: { country } }),
  });
  const { data: health, refetch: recheck, isFetching: healthLoading } = useQuery({
    queryKey: ["platform", "pack", country, "health"],
    queryFn: () => healthFn({ data: { country } }),
  });

  if (!data) return null;

  return (
    <Card className="border-primary">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{data.name} — detail</CardTitle>
          <div className="mt-1 text-xs text-muted-foreground font-mono">{data.country} · v{data.version}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <section>
          <h3 className="mb-1 font-semibold">Health</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{health?.status ?? "—"}</Badge>
            <Button size="sm" variant="outline" onClick={() => recheck()} disabled={healthLoading}>
              Re-check
            </Button>
          </div>
          {health?.checks ? (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(health.checks, null, 2)}
            </pre>
          ) : null}
        </section>

        {data.validation && (data.validation.errors.length > 0 || data.validation.warnings.length > 0) ? (
          <section>
            <h3 className="mb-1 font-semibold">Validator</h3>
            {data.validation.errors.map((e, i) => <p key={i} className="text-destructive text-xs">✗ {e}</p>)}
            {data.validation.warnings.map((w, i) => <p key={i} className="text-amber-500 text-xs">⚠ {w}</p>)}
          </section>
        ) : null}

        <section>
          <h3 className="mb-1 font-semibold">Installations ({data.installations.length})</h3>
          {data.installations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No install history recorded.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.installations.slice(0, 5).map((i) => (
                <li key={i.id} className="py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">v{i.pack_version} · {i.status}</span>
                    <span className="text-muted-foreground">{new Date(i.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-muted-foreground">
                    from {i.installed_from} · core {i.installed_core_version ?? "?"} · sdk {i.installed_sdk_version ?? "?"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-1 font-semibold">Manifest</h3>
          <pre className="max-h-64 overflow-auto rounded bg-muted p-2 text-xs">
            {data.manifest ? JSON.stringify(JSON.parse(data.manifest), null, 2) : "—"}
          </pre>
        </section>
      </CardContent>
    </Card>
  );
}
