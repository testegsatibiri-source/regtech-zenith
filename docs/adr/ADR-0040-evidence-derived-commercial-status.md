# ADR-0040 — Commercial status is derived from evidence

Status: Accepted · 2026-09-25

## Decision
`commercialReady` is not declared by hand. It is the AND of gates H20–H24 evaluated by the engine
against the Evidence Register. The signed manifest must equal the engine result (test-enforced);
flipping it requires closing the gaps and upgrading the evidence layers first.

## Consequences
- The PH pack stays VALIDATED / PILOT while any gate is not PASS.
- Evidence expires; stale evidence fails its gate automatically.
