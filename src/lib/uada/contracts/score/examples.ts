// H16.0 — Reference example of the Architecture Score payload.
// Kept next to the contract on purpose: engine, database rows, UI and tests all
// assert against this exact shape so they cannot drift apart.
import type { ScoreReport } from "@/lib/uada/contracts/score";

export const SCORE_REPORT_EXAMPLE: ScoreReport = {
  snapshot: "2026-07-31-h15",
  overall: 82,
  dimensions: [
    {
      name: "coupling",
      score: 76,
      weight: 0.25,
      evidence: ["3 cross-boundary edges"],
    },
    {
      name: "boundary_integrity",
      score: 88,
      weight: 0.25,
      evidence: ["1 pack importing core internals", "0 UI importing .server modules"],
    },
    {
      name: "documentation_coverage",
      score: 84,
      weight: 0.2,
      evidence: ["30 ADRs indexed", "84% of engines documented"],
    },
    {
      name: "knowledge_freshness",
      score: 90,
      weight: 0.15,
      evidence: ["snapshot 2 days old", "0 documents with failed embeddings"],
    },
    {
      name: "test_coverage",
      score: 72,
      weight: 0.15,
      evidence: ["71 test files", "72% of engines with a matching test"],
    },
  ],
  previousOverall: 79.5,
  delta: 2.5,
};
