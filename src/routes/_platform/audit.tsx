import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAudit } from "@/lib/platform/api.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_platform/audit")({
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(listAudit);
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: () => fn({ data: { limit: 200 } }),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Every platform action is recorded with correlation id.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Recent entries</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left">When</th>
                    <th className="px-2 py-2 text-left">Actor</th>
                    <th className="px-2 py-2 text-left">Action</th>
                    <th className="px-2 py-2 text-left">Component</th>
                    <th className="px-2 py-2 text-left">Country</th>
                    <th className="px-2 py-2 text-left">Target</th>
                    <th className="px-2 py-2 text-left">Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.at).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">{r.actor_id?.slice(0, 8) ?? "—"}</td>
                      <td className="px-2 py-2"><Badge variant="outline" className="font-mono text-[10px]">{r.action}</Badge></td>
                      <td className="px-2 py-2 text-xs">{r.component ?? "—"}</td>
                      <td className="px-2 py-2 text-xs">{r.country_code ?? "global"}</td>
                      <td className="px-2 py-2 font-mono text-xs">{r.target ?? "—"}</td>
                      <td className="px-2 py-2 font-mono text-[10px] text-muted-foreground">{r.correlation_id?.slice(0, 12) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
