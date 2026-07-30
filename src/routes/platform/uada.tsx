// H13 — Minimal UADA operations UI. Gated by uada.enabled.
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  reindex,
  listRecentRuns,
  getActiveSnapshotSummary,
} from "@/lib/uada/reindex/reindex.functions";
import { UadaConsole } from "@/components/uada/UadaConsole";

export const Route = createFileRoute("/platform/uada")({
  ssr: false,
  component: UadaPage,
  head: () => ({
    meta: [
      { title: "UADA — Knowledge Base" },
      { name: "description", content: "Internal AI development agent operations." },
    ],
  }),
});

function UadaPage() {
  const router = useRouter();
  const summaryFn = useServerFn(getActiveSnapshotSummary);
  const runsFn = useServerFn(listRecentRuns);
  const reindexFn = useServerFn(reindex);

  const summary = useQuery({ queryKey: ["uada", "summary"], queryFn: () => summaryFn() });
  const runs = useQuery({ queryKey: ["uada", "runs"], queryFn: () => runsFn() });

  const [mode, setMode] = useState<"full" | "incremental">("full");
  const mutation = useMutation({
    mutationFn: () => reindexFn({ data: { mode, reason: "manual" as const } }),
    onSettled: () => router.invalidate(),
  });

  if (summary.isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  const gateOff = summary.data && !summary.data.gateEnabled;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">UADA — Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          Internal development agent. Environment: {summary.data?.env ?? "unknown"} · Gate:{" "}
          <Badge variant={summary.data?.gateEnabled ? "default" : "secondary"}>
            {summary.data?.gateEnabled ? "ON" : "OFF"}
          </Badge>
        </p>
      </header>

      {gateOff && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-sm">
            The <code>uada.enabled</code> feature gate is <b>off</b>. Reindex is disabled until an
            admin turns the gate on in Platform → Feature Flags.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.data?.active ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Version</dt>
              <dd>{summary.data.active.version}</dd>
              <dt className="text-muted-foreground">Promotion state</dt>
              <dd>{summary.data.active.promotion_state}</dd>
              <dt className="text-muted-foreground">Model</dt>
              <dd>{summary.data.active.embedding_model} · {summary.data.active.embedding_dimensions}d</dd>
              <dt className="text-muted-foreground">Documents</dt>
              <dd>{(summary.data.active.stats as { documents?: number })?.documents ?? 0}</dd>
              <dt className="text-muted-foreground">Nodes / edges</dt>
              <dd>
                {(summary.data.active.stats as { nodes?: number })?.nodes ?? 0} /{" "}
                {(summary.data.active.stats as { edges?: number })?.edges ?? 0}
              </dd>
              <dt className="text-muted-foreground">Activated at</dt>
              <dd>{summary.data.active.activated_at ?? "—"}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No active snapshot yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reindex</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              className="rounded border bg-background px-2 py-1 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as "full" | "incremental")}
              disabled={mutation.isPending || gateOff}
            >
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
            </select>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || gateOff}
            >
              {mutation.isPending ? "Running…" : "Run reindex"}
            </Button>
          </div>
          {mutation.data && (
            <div className="rounded border p-3 text-xs">
              <div><b>Snapshot:</b> {mutation.data.snapshotId}</div>
              <div><b>Promotion:</b> {mutation.data.promotionState}</div>
              <div><b>Duration:</b> {mutation.data.durationMs} ms</div>
              {mutation.data.reasons && (
                <div className="text-destructive">Reasons: {mutation.data.reasons.join(", ")}</div>
              )}
            </div>
          )}
          {mutation.error && (
            <div className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Reindex failed"}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (runs.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left p-1">When</th>
                    <th className="text-left p-1">Mode</th>
                    <th className="text-right p-1">Docs</th>
                    <th className="text-right p-1">Denied</th>
                    <th className="text-right p-1">Nodes/Edges</th>
                    <th className="text-right p-1">Tokens</th>
                    <th className="text-right p-1">Duration</th>
                    <th className="text-left p-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(runs.data ?? []).map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-1">{r.started_at}</td>
                      <td className="p-1">{r.mode}</td>
                      <td className="p-1 text-right">{r.docs_upserted}</td>
                      <td className="p-1 text-right">{r.docs_denied}</td>
                      <td className="p-1 text-right">{r.graph_nodes}/{r.graph_edges}</td>
                      <td className="p-1 text-right">{r.embedding_tokens}</td>
                      <td className="p-1 text-right">{r.duration_ms ?? "—"} ms</td>
                      <td className="p-1">
                        <Badge variant={r.ok ? "default" : "destructive"}>
                          {r.ok ? "ok" : "failed"}
                        </Badge>
                      </td>
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
