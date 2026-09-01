// H16 — Pure, deterministic Architecture Score dimensions.
// No I/O, no clock, no randomness: same ArchitectureFacts => same output.
import type { ArchitectureFacts } from "@/lib/uada/contracts/score/facts";
import {
  SCORE_WEIGHTS,
  computeOverall,
  roundScore,
  type ScoreDimension,
  type ScoreReport,
} from "@/lib/uada/contracts/score";

/** Architectural layer a path belongs to. Mirrors ADR-0001 boundaries. */
export type Layer = "core" | "sdk" | "pack" | "platform" | "uada" | "ui" | "other";

export function layerOf(path: string | undefined): Layer {
  if (!path) return "other";
  const p = path.replace(/^\.?\//, "");
  if (p.startsWith("src/packs/") || p.startsWith("src/countries/")) return "pack";
  if (p.startsWith("src/sdk/")) return "sdk";
  if (p.startsWith("src/lib/uada/")) return "uada";
  if (p.startsWith("src/lib/platform/") || p.startsWith("src/routes/platform")) return "platform";
  if (p.startsWith("src/components/") || p.startsWith("src/routes/")) return "ui";
  if (p.startsWith("src/lib/") || p.startsWith("src/engines/")) return "core";
  return "other";
}

function isTestPath(path: string | undefined): boolean {
  if (!path) return false;
  return path.includes("__tests__") || /\.(test|spec)\.[tj]sx?$/.test(path);
}

function clamp(value: number): number {
  return roundScore(Math.min(100, Math.max(0, value)));
}

function pathOf(facts: ArchitectureFacts, id: string): string | undefined {
  return facts.nodes.find((n) => n.id === id)?.path;
}

/** Cross-layer import/dependency edges penalise coupling. */
function couplingDimension(facts: ArchitectureFacts): ScoreDimension {
  const relevant = facts.edges.filter((e) => e.kind === "imports" || e.kind === "depends_on");
  const crossing = relevant.filter((e) => {
    const from = layerOf(pathOf(facts, e.fromId));
    const to = layerOf(pathOf(facts, e.toId));
    return from !== "other" && to !== "other" && from !== to;
  });
  const ratio = relevant.length === 0 ? 0 : crossing.length / relevant.length;
  return {
    name: "coupling",
    weight: SCORE_WEIGHTS.coupling,
    score: relevant.length === 0 ? 0 : clamp(100 - ratio * 100),
    evidence: [
      `${crossing.length} cross-boundary edges`,
      `${relevant.length} import/dependency edges analysed`,
    ],
  };
}

/** Illegal directions defined by the ADRs. Each violation costs 10 points. */
const ILLEGAL_EDGES: Array<{ from: Layer; to: Layer; label: string }> = [
  { from: "pack", to: "core", label: "pack importing core internals" },
  { from: "pack", to: "platform", label: "pack importing platform internals" },
  { from: "pack", to: "uada", label: "pack importing UADA internals" },
  { from: "sdk", to: "pack", label: "SDK importing a country pack" },
  { from: "sdk", to: "core", label: "SDK importing core internals" },
  { from: "core", to: "pack", label: "core importing a country pack" },
];

function boundaryDimension(facts: ArchitectureFacts): ScoreDimension {
  const counts = new Map<string, number>();
  for (const e of facts.edges) {
    if (e.kind !== "imports" && e.kind !== "depends_on") continue;
    const from = layerOf(pathOf(facts, e.fromId));
    const to = layerOf(pathOf(facts, e.toId));
    const rule = ILLEGAL_EDGES.find((r) => r.from === from && r.to === to);
    if (rule) counts.set(rule.label, (counts.get(rule.label) ?? 0) + 1);
  }
  // UI must never import a server-only module directly.
  let uiToServer = 0;
  for (const e of facts.edges) {
    if (e.kind !== "imports") continue;
    const fromPath = pathOf(facts, e.fromId);
    const toPath = pathOf(facts, e.toId);
    if (layerOf(fromPath) === "ui" && toPath && /\.server\.[tj]sx?$/.test(toPath)) uiToServer++;
  }
  if (uiToServer > 0) counts.set("UI importing .server modules", uiToServer);

  const violations = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const evidence =
    counts.size === 0
      ? ["0 boundary violations"]
      : Array.from(counts.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([label, n]) => `${n} ${label}`);
  return {
    name: "boundary_integrity",
    weight: SCORE_WEIGHTS.boundary_integrity,
    score: clamp(100 - violations * 10),
    evidence,
  };
}

function documentationDimension(facts: ArchitectureFacts): ScoreDimension {
  const adrs = facts.documents.filter((d) => d.kind === "adr" || d.path.includes("/adr/"));
  const documented = facts.documents.filter((d) => d.hasSummary).length;
  const total = facts.documents.length;
  const summaryRatio = total === 0 ? 0 : documented / total;
  // ADR presence saturates at 20 records.
  const adrRatio = Math.min(1, adrs.length / 20);
  const score = clamp(summaryRatio * 70 + adrRatio * 30);
  return {
    name: "documentation_coverage",
    weight: SCORE_WEIGHTS.documentation_coverage,
    score,
    evidence: [
      `${adrs.length} ADRs indexed`,
      `${Math.round(summaryRatio * 100)}% of ${total} documents summarised`,
    ],
  };
}

function freshnessDimension(facts: ArchitectureFacts): ScoreDimension {
  const ageMs = Date.parse(facts.now) - Date.parse(facts.snapshotCreatedAt);
  const ageDays = Number.isFinite(ageMs) ? Math.max(0, Math.floor(ageMs / 86_400_000)) : 0;
  // Full marks up to 7 days, then linear decay to 0 at 45 days.
  const ageScore = ageDays <= 7 ? 100 : Math.max(0, 100 - ((ageDays - 7) / 38) * 100);
  const { ready, failed, pending } = facts.embeddings;
  const totalEmbeddings = ready + failed + pending;
  const embeddingScore = totalEmbeddings === 0 ? 0 : (ready / totalEmbeddings) * 100;
  return {
    name: "knowledge_freshness",
    weight: SCORE_WEIGHTS.knowledge_freshness,
    score: clamp(ageScore * 0.5 + embeddingScore * 0.5),
    evidence: [
      `snapshot ${ageDays} day(s) old`,
      `${failed} document(s) with failed embeddings`,
      `${pending} document(s) pending embedding`,
    ],
  };
}

function testDimension(facts: ArchitectureFacts): ScoreDimension {
  const tests = facts.documents.filter((d) => isTestPath(d.path));
  const modules = facts.documents.filter(
    (d) =>
      !isTestPath(d.path) &&
      /\.(ts|tsx)$/.test(d.path) &&
      (layerOf(d.path) === "sdk" || layerOf(d.path) === "pack" || layerOf(d.path) === "uada"),
  );
  const ratio =
    modules.length === 0 ? 0 : Math.min(1, tests.length / Math.max(1, modules.length / 4));
  return {
    name: "test_coverage",
    weight: SCORE_WEIGHTS.test_coverage,
    score: clamp(ratio * 100),
    evidence: [
      `${tests.length} test file(s) indexed`,
      `${modules.length} governed module(s) in scope`,
    ],
  };
}

function regulatoryAccuracyDimension(facts: ArchitectureFacts): ScoreDimension {
  const packs = facts.regulatory;
  if (packs.length === 0) {
    return {
      name: "regulatory_accuracy",
      weight: SCORE_WEIGHTS.regulatory_accuracy,
      score: 100,
      evidence: ["no country packs installed"],
    };
  }
  const notReady = packs.filter((p) => p.commercialReady !== true);
  const simplified = packs.filter((p) => p.simplified === true);
  const score = clamp(100 - (notReady.length / packs.length) * 100);
  const evidence = [
    `${packs.length} pack(s) installed`,
    `${notReady.length} pack(s) not commercial-ready`,
    `${simplified.length} pack(s) using simplified engines`,
    ...notReady.map((p) => `${p.country} v${p.version}: regulatory correction pending`),
  ];
  return {
    name: "regulatory_accuracy",
    weight: SCORE_WEIGHTS.regulatory_accuracy,
    score,
    evidence,
  };
}

export function computeDimensions(facts: ArchitectureFacts): ScoreDimension[] {
  return [
    couplingDimension(facts),
    boundaryDimension(facts),
    documentationDimension(facts),
    freshnessDimension(facts),
    testDimension(facts),
    regulatoryAccuracyDimension(facts),
  ];
}

export function computeScoreReport(
  facts: ArchitectureFacts,
  previousOverall?: number,
): ScoreReport {
  const dimensions = computeDimensions(facts);
  const overall = computeOverall(dimensions);
  const report: ScoreReport = {
    snapshot: `v${facts.snapshotVersion}`,
    overall,
    dimensions,
  };
  if (typeof previousOverall === "number") {
    report.previousOverall = roundScore(previousOverall);
    report.delta = roundScore(overall - previousOverall);
  }
  return report;
}
