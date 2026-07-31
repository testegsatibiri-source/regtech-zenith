# ADR-0030 — Review Principle (UADA H15)

Status: Accepted — H15
Extends: ADR-0020, ADR-0025, ADR-0029.

## Context

H14 delivered retrieval and reasoning (Search, Impact, Plan). The next
governance gap is change review: architectural rules (pack isolation, UADA
boundaries, migration hygiene, frozen contracts) were documented in ADRs but
enforced only by human reviewers, inconsistently.

## Decision

### 1. Rules before models

`ReviewEngine` runs **deterministic rules first**. Rules are pure functions of
a parsed unified diff — no database, no model, no network. The same diff always
produces byte-identical findings in a stable total ordering
(severity, rule id, path, line, title).

Rule set (H15):

| Id | Severity | Enforces |
| --- | --- | --- |
| ARCH-001 | error | Nothing outside `src/lib/uada/**` imports UADA internals (ADR-0020) |
| ARCH-002 | error | Engines never read stores directly (ADR-0029) |
| ARCH-003 | error | Engines never call the gateway/ModelRouter directly (ADR-0029) |
| ARCH-004 | error | UADA never references PII tables (ADR-0020) |
| ARCH-005 | error | Country packs import only `src/sdk/**` (ADR-0003, ADR-0018) |
| ARCH-006 | error | New `public.*` tables ship GRANTs and RLS in the same migration |
| ARCH-007 | warning | Frozen contracts change only alongside an ADR |
| ARCH-008 | error | UADA server functions carry auth middleware |

### 2. Advisory findings are evidence-bound

Model output is additive and never overrides a rule. Every advisory finding
must cite a path present in the `ContextBundle`; ungrounded findings are
dropped. Zero evidence => zero advisory findings and `confidence = 0`, with the
deterministic findings still returned.

### 3. Boundaries unchanged

`ReviewEngine` reads no store: it composes a `ContextRequest` and consumes the
`ContextBundle`, and all inference flows through `InferenceService`. The engine
performs no writes.

### 4. Verdict

`block` when any error exists, `comment` when only warnings exist, otherwise
`approve`. CI (H15+) can consume the verdict directly.

## Consequences

- Architectural drift is caught mechanically, not by reviewer memory.
- New rules are one pure function plus a test; no engine changes.
- Review output is reproducible and therefore diff-able across snapshots.
