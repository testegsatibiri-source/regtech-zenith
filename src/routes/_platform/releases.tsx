import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listReleases, transitionRelease } from "@/lib/platform/api.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/releases")({
  component: ReleasesPage,
});

const NEXT_STATES: Record<string, string[]> = {
  draft: ["candidate", "archived"],
  candidate: ["approved", "archived"],
  approved: ["released", "archived"],
  released: ["deprecated", "rolled_back"],
  deprecated: ["archived"],
  archived: [],
  rolled_back: ["archived"],
};

function ReleasesPage() {
  const listFn = useServerFn(listReleases);
  const transitionFn = useServerFn(transitionRelease);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "releases"],
    queryFn: () => listFn({ data: {} }),
  });

  const mutate = useMutation({
    mutationFn: (input: { id: string; to: string }) =>
      transitionFn({ data: input as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "releases"] });
      qc.invalidateQueries({ queryKey: ["platform", "dashboard"] });
      toast.success("Release transition applied");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Release Center</h1>
        <p className="text-muted-foreground">6-state lifecycle. Gates enforced on approved → released.</p>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No installation records yet.</p>
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{r.country_code} · v{r.pack_version}</CardTitle>
                  <div className="text-xs text-muted-foreground font-mono">
                    {r.installed_from} · {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                {(NEXT_STATES[r.status] ?? []).map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant={next === "released" ? "default" : "outline"}
                    disabled={mutate.isPending}
                    onClick={() => mutate.mutate({ id: r.id, to: next })}
                  >
                    → {next}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
