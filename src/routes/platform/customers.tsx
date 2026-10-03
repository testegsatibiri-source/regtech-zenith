// Backoffice — Customer workspaces created through the Pilot Program.
// Presentation only: reads are role-gated and audited server-side.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPilotCustomers } from "@/lib/pilot.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/platform/customers")({
  head: () => ({ meta: [{ title: "Customers — UBoardAsia Backoffice" }] }),
  component: CustomersPage,
});

function d(v: string | null) {
  return v ? new Date(v).toISOString().slice(0, 10) : "—";
}

function CustomersPage() {
  const fn = useServerFn(listPilotCustomers);
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "customers"],
    queryFn: () => fn(),
  });
  const rows = data ?? [];
  const now = Date.now();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">
          Workspaces created by pilot customers, with their authorized jurisdiction and pilot
          expiry.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspaces ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="p-4 text-sm text-destructive">{(error as Error).message}</p>}
          {!isLoading && rows.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No customer workspaces yet.</p>
          )}
          {rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-3">Company</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Origin</th>
                  <th className="p-3">Pilot expires</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const expired = r.pilotExpiresAt && new Date(r.pilotExpiresAt).getTime() < now;
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium">{r.name}</div>
                        {r.legal_name && (
                          <div className="text-xs text-muted-foreground">{r.legal_name}</div>
                        )}
                      </td>
                      <td className="p-3">{r.country_code}</td>
                      <td className="p-3">{r.ownerEmail ?? "—"}</td>
                      <td className="p-3">
                        {r.pilotId ? (
                          <Badge variant="default">Pilot · {r.authorizedCountry}</Badge>
                        ) : (
                          <Badge variant="outline">Staff / legacy</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {expired ? (
                          <Badge variant="destructive">Expired {d(r.pilotExpiresAt)}</Badge>
                        ) : (
                          d(r.pilotExpiresAt)
                        )}
                      </td>
                      <td className="p-3">{d(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
