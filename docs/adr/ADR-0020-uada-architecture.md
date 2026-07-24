# ADR-0020 — UADA architecture & boundaries

- **Status:** Accepted (Sprint H12.5)
- **Date:** 2026-07-27
- **Deciders:** Platform, Governance

## Context

We are adding an internal AI Development Agent (UADA) that reasons about the
UBoard Asia Compliance OS: architecture, ADRs, schema, packs, and code. It
must never leak into customer app code, must never see PII, and must be
replaceable module-by-module.

## Decision

UADA lives in its own module tree with hard boundaries:

- Source: `src/lib/uada/**` — contracts, engines, registries, prompts.
- UI: `src/routes/platform/uada/**` (H14+).
- API: `src/routes/api/uada/**` (H14+).
- Tables: `uada_*` prefix, restricted to platform roles (H13+).
- Workflows: `.github/workflows/uada-*.yml` (H15+).

Boundary rules:

1. Nothing outside `src/lib/uada/**` may import from it (lint guard, H13).
2. UADA never reads customer PII tables (`payroll_items`, `employees`,
   `employment_contracts`, etc.) — only schemas and structural metadata.
3. **Knowledge Store** (documents + snapshots + embeddings) and **Graph
   Store** (nodes + edges + traversal) are separate components with distinct
   contracts. Same Postgres today; can split later without a rewrite.
4. Every engine returns `UadaResponse<T>` — see ADR-0025.
5. Every capability declares WHAT (`CapabilityRegistry`) and every
   implementation binds HOW (`ToolRegistry`). The Orchestrator (H19)
   resolves via both.

## Consequences

- **+** UADA is deletable in one commit if it fails to prove itself.
- **+** Two-store separation avoids the "vector search entangled with graph
  queries" trap most agent platforms hit at scale.
- **−** Slight duplication of infra (two migrations, two admin surfaces)
  once H13 lands; acceptable trade-off for evolvability.
