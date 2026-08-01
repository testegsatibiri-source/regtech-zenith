# Sprint H16 — UADA Architecture Score & Tool Bindings

With Search, Impact, Planner and Review live (H14/H15), the next step is to make UADA
measure the architecture instead of only answering questions about it, and to make every
engine reachable through one uniform execution surface.

## Goals

1. **Architecture Score** — a deterministic, evidence-backed score computed from the
   current snapshot, persisted per snapshot so trends and regressions are visible.
2. **Tool bindings** — register all existing engines (search, impact, plan, review, score)
   in the ToolRegistry, so the future Orchestrator resolves capabilities uniformly instead
   of importing engines directly.
3. **Console surface** — a "Architecture score" card on `/platform/uada` showing dimensions,
   deltas versus the previous snapshot, and the evidence behind each dimension.

## Score dimensions (all deterministic, computed from Knowledge + Graph stores)

| Dimension | What it measures |
| --- | --- |
| Coupling | Cross-boundary edges (packs → core, UI → `.server`) over total edges |
| Boundary integrity | Violations of the ADR-0029/0030 rules found by re-running review rules over indexed files |
| Documentation coverage | Share of ADR-relevant modules with a matching doc/ADR node |
| Knowledge freshness | Snapshot age and share of stale documents per ADR-0028 |
| Test coverage signal | Share of engines/packs with a sibling `__tests__` node in the graph |

Each dimension yields `score 0..100`, a `weight`, and the evidence rows that produced it.
The overall score is the weighted mean. No model is involved — the score must be
reproducible for the same snapshot.

## H16.0 — Contract freeze (antes de codar)

Primeira etapa da sprint, feita e revisada antes de qualquer engine ou migração:

- `src/lib/uada/contracts/score/index.ts` — `ScoreDimension`, `ScoreReport`, tabela de pesos.
- `src/lib/uada/contracts/score/examples.ts` — um `ScoreReport` de exemplo, tipado, servindo
  como fonte única de verdade:

```text
{
  "snapshot": "2026-07-31-h15",
  "overall": 82,
  "dimensions": [
    { "name": "coupling", "score": 76, "weight": 0.25, "evidence": ["3 cross-boundary edges"] }
  ]
}
```

- O exemplo é consumido pelos testes (validação de forma e de soma de pesos = 1), pelas
  fixtures da UI e pela checagem de que as colunas de `uada_score_reports` cobrem cada campo.
  Engine, banco, UI e testes passam a divergir só se o contrato mudar.

## Deliverables


- `src/lib/uada/engines/score.server.ts` — computes dimensions from ContextAssembler +
  Graph Store; returns the standard `UadaResponse<ScoreReport>`.
- Migration: `uada_score_reports` (snapshot_version, dimension, score, weight, details jsonb,
  created_at) with GRANTs, RLS restricted to platform admin/operator/country CTO, plus a
  unique key on (snapshot_version, dimension) so recomputation is idempotent.
- `src/lib/uada/tools/bindings.server.ts` — binds `search`, `impact`, `plan`, `review`,
  `score` into the ToolRegistry; a test asserts every CapabilityRegistry id that has an
  engine is bound.
- Server function `uadaScore` in `src/lib/uada/uada.functions.ts` (same role gate as the
  other UADA functions).
- Console card in `src/components/uada/UadaConsole.tsx`: overall gauge, per-dimension bars,
  delta versus the previous stored snapshot, evidence block.
- `docs/adr/ADR-0031-architecture-score.md` — dimensions, weights, determinism rule,
  and the policy that a score drop over a threshold is a release blocker (documented,
  not yet enforced in CI).
- Tests in `src/lib/uada/__tests__/h16.test.ts`: determinism (same snapshot → same score),
  weight normalisation, empty-snapshot behaviour (score 0, confidence 0), tool bindings.

## Technical notes

- Score engine reads context only through `ContextAssembler` — no direct store access from
  the engine, per ADR-0029.
- Persistence uses `supabaseAdmin` inside the handler after the role check, matching the
  existing UADA server-function pattern.
- Files declaring `createServerFn` stay thin wrappers with dynamic engine imports.
- No business modules and no Country Pack changes in this sprint.

## Out of scope

Docs generation engine, multi-agent orchestrator, and CI enforcement of score thresholds —
those follow in H17+.
