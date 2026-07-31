// H14 — Operational console: Search / Impact / Plan / Benchmark.
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UadaResponse } from "@/lib/uada/contracts/response";
import type { SearchHitV2 } from "@/lib/uada/engines/search.server";
import type { ImpactReportV2 } from "@/lib/uada/contracts/impact";
import type { Plan } from "@/lib/uada/contracts/plan";
import type { ReviewReport } from "@/lib/uada/contracts/review";
import {
  uadaSearch,
  uadaImpactOf,
  uadaPlan,
  uadaRunBenchmark,
  uadaReview,
} from "@/lib/uada/uada.functions";


function ErrorLine({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="text-sm text-destructive">
      {error instanceof Error ? error.message : "Request failed"}
    </p>
  );
}

function EvidenceBlock({
  confidence,
  snapshotVersion,
  filesUsed,
}: {
  confidence: number;
  snapshotVersion: number;
  filesUsed: string[];
}) {
  return (
    <div className="rounded border bg-muted/40 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={confidence >= 0.6 ? "default" : "secondary"}>
          confidence {(confidence * 100).toFixed(0)}%
        </Badge>
        <span className="text-muted-foreground">snapshot v{snapshotVersion}</span>
        <span className="text-muted-foreground">{filesUsed.length} files</span>
      </div>
      {filesUsed.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-muted-foreground">
          {filesUsed.slice(0, 10).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UadaConsole({ disabled }: { disabled?: boolean }) {
  const searchFn = useServerFn(uadaSearch);
  const impactFn = useServerFn(uadaImpactOf);
  const planFn = useServerFn(uadaPlan);
  const benchFn = useServerFn(uadaRunBenchmark);
  const reviewFn = useServerFn(uadaReview);

  const [query, setQuery] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [objective, setObjective] = useState("");
  const [diff, setDiff] = useState("");

  const review = useMutation({
    mutationFn: () =>
      reviewFn({ data: { diff, advisory: true, maxDocuments: 10 } }) as Promise<UadaResponse<ReviewReport>>,
  });


  const search = useMutation({
    mutationFn: () =>
      searchFn({
        data: { query, k: 10, minimumScore: 0.1, expansionDepth: 0, reranker: "graph-proximity" as const },
      }) as Promise<UadaResponse<SearchHitV2[]>>,
  });
  const impact = useMutation({ mutationFn: () => impactFn({ data: { nodeId, depth: 2 } }) as Promise<UadaResponse<ImpactReportV2>>,
  });
  const plan = useMutation({
    mutationFn: () =>
      planFn({ data: { objective, maxDocuments: 12, expansionDepth: 1 } }) as Promise<UadaResponse<Plan>>,
  });
  const bench = useMutation({ mutationFn: () => benchFn({ data: {} }) });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="How does the Indonesia TER table get resolved?"
              disabled={disabled}
            />
            <Button onClick={() => search.mutate()} disabled={disabled || !query || search.isPending}>
              {search.isPending ? "Searching…" : "Search"}
            </Button>
          </div>
          <ErrorLine error={search.error} />
          {search.data && (
            <div className="space-y-2">
              <EvidenceBlock
                confidence={search.data.confidence}
                snapshotVersion={search.data.snapshotVersion}
                filesUsed={search.data.filesUsed}
              />
              <ul className="space-y-1 text-xs">
                {search.data.data.map((h) => (
                  <li key={h.documentId} className="rounded border p-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-mono">{h.path}</span>
                      <span className="text-muted-foreground">{h.score.toFixed(3)}</span>
                    </div>
                    <p className="text-muted-foreground">{h.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impact analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              placeholder="graph node UUID"
              disabled={disabled}
            />
            <Button onClick={() => impact.mutate()} disabled={disabled || !nodeId || impact.isPending}>
              {impact.isPending ? "Analysing…" : "Analyse"}
            </Button>
          </div>
          <ErrorLine error={impact.error} />
          {impact.data && (
            <div className="space-y-2">
              <EvidenceBlock
                confidence={impact.data.confidence}
                snapshotVersion={impact.data.snapshotVersion}
                filesUsed={impact.data.filesUsed}
              />
              <div className="flex gap-2 text-xs">
                <Badge variant="destructive">direct {impact.data.data.totals.direct}</Badge>
                <Badge>indirect {impact.data.data.totals.indirect}</Badge>
                <Badge variant="secondary">transitive {impact.data.data.totals.transitive}</Badge>
              </div>
              <ul className="space-y-1 text-xs">
                {impact.data.data.nodes.slice(0, 40).map((n) => (
                  <li key={n.node.id} className="flex justify-between gap-2 rounded border p-2">
                    <span className="font-mono">{n.node.path ?? n.node.label}</span>
                    <span className="text-muted-foreground">
                      {n.level} · {(n.confidence * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Objective, e.g. add a Vietnam country pack skeleton"
            rows={3}
            disabled={disabled}
          />
          <Button onClick={() => plan.mutate()} disabled={disabled || objective.length < 4 || plan.isPending}>
            {plan.isPending ? "Planning…" : "Generate plan"}
          </Button>
          <ErrorLine error={plan.error} />
          {plan.data && (
            <div className="space-y-2 text-xs">
              <EvidenceBlock
                confidence={plan.data.confidence}
                snapshotVersion={plan.data.snapshotVersion}
                filesUsed={plan.data.filesUsed}
              />
              <p>{plan.data.data.summary}</p>
              <ol className="list-decimal space-y-1 pl-4">
                {plan.data.data.steps.map((s) => (
                  <li key={s.order}>
                    <b>{s.title}</b> — {s.detail}
                    {s.affectedFiles.length > 0 && (
                      <div className="font-mono text-muted-foreground">{s.affectedFiles.join(", ")}</div>
                    )}
                  </li>
                ))}
              </ol>
              {plan.data.data.risks.length > 0 && (
                <ul className="list-disc pl-4">
                  {plan.data.data.risks.map((r, i) => (
                    <li key={i}>
                      <Badge variant={r.severity === "high" ? "destructive" : "secondary"}>{r.severity}</Badge>{" "}
                      {r.description}
                    </li>
                  ))}
                </ul>
              )}
              {plan.data.data.blockedBy.length > 0 && (
                <p className="text-destructive">Blocked by: {plan.data.data.blockedBy.join(", ")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search benchmark</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => bench.mutate()} disabled={disabled || bench.isPending}>
            {bench.isPending ? "Running…" : "Run benchmark"}
          </Button>
          <ErrorLine error={bench.error} />
          {bench.data && (
            <div className="rounded border p-3 text-xs">
              <div><b>Snapshot:</b> v{bench.data.snapshotVersion}</div>
              <div><b>Fixtures:</b> {bench.data.ran} · <b>Hits:</b> {bench.data.hits}</div>
              <div><b>Avg precision@5:</b> {bench.data.avgPrecision.toFixed(3)}</div>
              <div className={bench.data.regressions > 0 ? "text-destructive" : undefined}>
                <b>Regressions:</b> {bench.data.regressions}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
