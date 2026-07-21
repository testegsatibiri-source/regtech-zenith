import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getReadiness } from "@/lib/platform/readiness.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export const Route = createFileRoute("/platform/readiness")({
  component: ReadinessPage,
});

function ReadinessPage() {
  const fn = useServerFn(getReadiness);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform", "readiness"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  const statusTone: Record<string, string> = {
    ready: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    degraded: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    booting: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7" /> Runtime Readiness
          </h1>
          <p className="text-muted-foreground">
            Boot Health Gate + Compatibility Matrix + Feature Gates. Snapshot atualiza a cada 30s.
          </p>
        </div>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "…" : "Recarregar"}
        </button>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : data ? (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Overview</CardTitle>
              <Badge variant="outline" className={statusTone[data.status] ?? ""}>
                {data.status.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Meta label="Environment" value={data.environment} />
              <Meta label="Runtime" value={data.runtimeVersion} />
              <Meta label="SDK" value={data.sdkVersion} />
              <Meta label="Interface" value={`v${data.interfaceVersion}`} />
              <Meta label="Matrix" value={`v${data.matrixVersion}`} />
              <Meta label="Trust policy" value={data.trustPolicy.environment} />
              <Meta label="Signatures req." value={String(data.trustPolicy.requiredSignatures)} />
              <Meta label="Timestamp" value={new Date(data.ts).toLocaleString()} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Boot steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.steps.map((s) => (
                  <div key={s.name} className="flex items-start gap-2">
                    {s.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    ) : s.severity === "error" ? (
                      <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                    )}
                    <div>
                      <div className="font-mono text-xs uppercase tracking-wide">{s.name}</div>
                      {s.message ? <div className="text-muted-foreground">{s.message}</div> : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature gates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(data.gates).map(([g, on]) => (
                  <div key={g} className="flex items-center justify-between font-mono text-xs">
                    <span>{g}</span>
                    <Badge variant="outline" className={on ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "text-muted-foreground"}>
                      {on ? "on" : "off"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Country packs ({data.packs.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {data.packs.map((p) => (
                <div key={p.country} className="flex items-center justify-between border-b border-border py-1 last:border-0">
                  <span className="font-mono">{p.country} · v{p.version}</span>
                  <Badge variant="outline" className={statusTone[p.status] ?? ""}>{p.status}</Badge>
                </div>
              ))}
              {data.packs.length === 0 ? <p className="text-muted-foreground">Nenhum pack registrado.</p> : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}
