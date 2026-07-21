import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listFlags, upsertFlag, listPacks } from "@/lib/platform/api.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/platform/flags")({
  component: FlagsPage,
});

function FlagsPage() {
  const listFn = useServerFn(listFlags);
  const upsertFn = useServerFn(upsertFlag);
  const packsFn = useServerFn(listPacks);
  const qc = useQueryClient();

  const { data: packs } = useQuery({
    queryKey: ["platform", "packs"],
    queryFn: () => packsFn(),
  });
  const { data: flags, isLoading } = useQuery({
    queryKey: ["platform", "flags"],
    queryFn: () => listFn({ data: {} }),
  });

  const [country, setCountry] = useState<string>("");
  const [flag, setFlag] = useState("");
  const [rollout, setRollout] = useState<number>(100);
  const [environment, setEnvironment] = useState<"preview" | "production" | "all">("all");

  const mutate = useMutation({
    mutationFn: (input: {
      country: string; flag: string; enabled: boolean;
      rollout_percentage?: number; environment?: "preview" | "production" | "all";
    }) => upsertFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "flags"] });
      toast.success("Flag saved");
      setFlag("");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Feature Flags</h1>
        <p className="text-muted-foreground">Per-country, per-environment. Rollout percentages advisory.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Create / update</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {(packs ?? []).map((p) => <SelectItem key={p.country} value={p.country}>{p.country}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Flag key</Label>
            <Input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="pph21.ter" />
          </div>
          <div>
            <Label>Environment</Label>
            <Select value={environment} onValueChange={(v) => setEnvironment(v as typeof environment)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="preview">preview</SelectItem>
                <SelectItem value="production">production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rollout %</Label>
            <Input type="number" min={0} max={100} value={rollout} onChange={(e) => setRollout(Number(e.target.value))} />
          </div>
          <div className="flex items-end gap-2">
            <Button
              disabled={!country || !flag || mutate.isPending}
              onClick={() => mutate.mutate({ country, flag, enabled: true, rollout_percentage: rollout, environment })}
            >Enable</Button>
            <Button
              variant="outline"
              disabled={!country || !flag || mutate.isPending}
              onClick={() => mutate.mutate({ country, flag, enabled: false, rollout_percentage: rollout, environment })}
            >Disable</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Configured flags</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (flags ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No flags yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {(flags ?? []).map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-mono text-xs">{f.country_code} · {f.flag}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.environment} · rollout {f.rollout_percentage}%
                    </div>
                  </div>
                  <Badge variant={f.enabled ? "default" : "secondary"}>
                    {f.enabled ? "enabled" : "disabled"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
