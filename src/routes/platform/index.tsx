import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSnapshot } from "@/lib/platform/api.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/platform/")({
  component: PlatformOverview,
});

function PlatformOverview() {
  const fn = useServerFn(getDashboardSnapshot);
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "dashboard"],
    queryFn: () => fn(),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading overview…</p>;
  if (error) return <p className="text-destructive">Failed: {(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground">Live snapshot from the Runtime + governance DB.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi
          title="Installed packs"
          value={data.packs.installed}
          sub={`${data.packs.total} total`}
        />
        <Kpi
          title="Degraded / Failed"
          value={data.packs.degraded + data.packs.failed}
          sub={`${data.packs.incompatible} incompatible`}
          tone={data.packs.failed > 0 ? "bad" : "warn"}
        />
        <Kpi
          title="Health OK"
          value={`${Math.round(data.health.averageOk * 100)}%`}
          sub={`${data.health.countriesChecked} checked`}
        />
        <Kpi
          title="Active releases"
          value={data.releases.active}
          sub={`${data.releases.pending.approved} approved · ${data.releases.pending.candidate} candidate`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Release pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Draft" value={data.releases.pending.draft} />
            <Row label="Candidate" value={data.releases.pending.candidate} />
            <Row label="Approved" value={data.releases.pending.approved} />
            <Row label="Released (active)" value={data.releases.active} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Parameters register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="In review" value={data.parameters.review} />
            <Row label="Approved" value={data.parameters.approved} />
            <Row label="Active (advisory)" value={data.parameters.active} />
            <p className="pt-2 text-xs text-muted-foreground">
              Runtime remains Source of Truth (see ADR-0007).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.recentAudit.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                  <div>
                    <div className="font-mono text-xs">{r.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.component ?? "—"} · {r.country_code ?? "global"}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: string | number;
  sub?: string;
  tone?: "warn" | "bad";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={[
            "text-3xl font-bold",
            tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-500" : "",
          ].join(" ")}
        >
          {value}
        </div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="secondary">{value}</Badge>
    </div>
  );
}
