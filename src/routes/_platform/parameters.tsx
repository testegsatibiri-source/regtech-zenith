import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getRuntimeParameters, listRegisterParameters, listPacks } from "@/lib/platform/api.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_platform/parameters")({
  component: ParametersPage,
});

function ParametersPage() {
  const packsFn = useServerFn(listPacks);
  const runtimeFn = useServerFn(getRuntimeParameters);
  const registerFn = useServerFn(listRegisterParameters);

  const { data: packs } = useQuery({
    queryKey: ["platform", "packs"],
    queryFn: () => packsFn(),
  });
  const countries = useMemo(() => (packs ?? []).map((p) => p.country), [packs]);
  const [country, setCountry] = useState<string | null>(null);
  const active = country ?? countries[0] ?? null;

  const { data: runtime } = useQuery({
    queryKey: ["platform", "parameters", "runtime", active],
    queryFn: () => runtimeFn({ data: { country: active! } }),
    enabled: !!active,
  });
  const { data: register } = useQuery({
    queryKey: ["platform", "parameters", "register", active],
    queryFn: () => registerFn({ data: { country: active! } }),
    enabled: !!active,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Regulatory Parameters</h1>
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Source of Truth: Country Pack Runtime</span>
            {" — "}the register is advisory (see ADR-0007).
          </p>
        </div>
        {active ? (
          <Select value={active} onValueChange={setCountry}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
      </header>

      {!active ? (
        <p className="text-sm text-muted-foreground">No packs installed.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Runtime snapshot</CardTitle>
              <div className="text-xs text-muted-foreground font-mono">
                pack v{runtime?.packVersion} · ruleset {runtime?.rulesetVersion}
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[500px] overflow-auto rounded bg-muted p-3 text-xs">
                {runtime?.params ? JSON.stringify(JSON.parse(runtime.params), null, 2) : "—"}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Register history</CardTitle></CardHeader>
            <CardContent>
              {(register ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No versioned entries.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {(register ?? []).map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-mono text-xs">{r.parameter_key} · v{r.version}</div>
                        <div className="text-xs text-muted-foreground">checksum {r.checksum?.slice(0, 12)}…</div>
                      </div>
                      <Badge variant="outline">{r.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
