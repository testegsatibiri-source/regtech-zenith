# ADR-0025 — UADA response envelope & anti-hallucination policy

- **Status:** Accepted (Sprint H12.5)
- **Date:** 2026-07-27
- **Deciders:** Platform, Governance

## Context

An internal development agent that fabricates references (a nonexistent
table, a hallucinated ADR, a made-up route) is worse than no agent at all —
its confidence weaponizes the mistake. We need a machine-checkable output
contract that makes evidence a first-class field, not a footnote.

## Decision

Every UADA engine returns:

```ts
interface UadaResponse<T> {
  data: T;
  confidence: number;          // 0..1
  snapshotVersion: number;
  filesUsed: string[];
  model: string;
  evidence: Evidence[];
  warnings?: Warning[];
}
```

The base system prompt (`src/lib/uada/prompts/base.ts`) enforces:

- If evidence does not support the claim, respond **"Insufficient evidence"**
  and list what would be required.
- Never assume a file / table / column / route / RPC / ADR exists because
  it "should". If it is not in the evidence array, it does not exist for
  the purpose of the answer.
- Populate `evidence` with every artifact actually used; set `confidence`
  proportional to coverage.

UI surfaces (H14+) render the envelope explicitly — the developer always
sees confidence, snapshot version, evidence, and model.

## Consequences

- **+** Hallucinations become visible failures instead of silent ones.
- **+** Reviewers can audit any UADA output against the evidence trail.
- **−** Prompts and schemas are stricter, which reduces creative
  freeform; that is the intended trade.
