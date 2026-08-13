# ADR-0035 — Commercial readiness is a distinct, signed classification gate

Status: Accepted (Sprint H20)

## Context

The Philippines Country Pack (v1.0.0) was promoted to "Production" tier by the
existing cumulative gate: version ≥ 1.0, signed, health-ok, and
interfaceVersion present. Yet its calculation engines still contained
simplified fiscal assumptions (SSS clamped instead of stepped MSC, 13th month
based on monthly salary instead of total earned over 12 months, missing ₱90k
TRAIN tax exemption). A public calculator or API could therefore be
structurally sound and legally wrong.

The core gap: **structural integrity ≠ regulatory correctness**. The old gate
could not distinguish a correctly implemented stub from a legally accurate
production engine.

## Decision

Introduce a new, explicit, signed manifest field and a corresponding tier gate:

```text
commercialReady: boolean
```

- `commercialReady: true` means the pack's calculation engines are backed by
  real statutory tables/rates, not simplified models, and the pack is safe for
  commercial payroll / API / public calculator exposure.
- `commercialReady` is **optional** in the manifest type for retro-compatibility
  but **mandatory** for classification as `production`.
- It is included in the canonical signed bytes of the manifest. Any tamper with
  the field invalidates the signature.
- The UADA Architecture Score gains a new `regulatory_accuracy` dimension (15%)
  so that a simplified-but-healthy pack immediately lowers the global score.

## Tier semantics after this ADR

| Tier | Meaning | How it appears |
|------|---------|--------------|
| `production` | `commercialReady: true` + structural health + signature + health ok. Safe for commercial use. | Live calculator, onboarding, API. |
| `beta` | One or more blockers. If the only blocker is "regulatory correction pending", the pack is structurally sound but not yet commercially exposed. | Showcased in landing/catalog, but no calculator, no onboarding selection, no commercial API. |
| `failed` / `incompatible` | Structural failure. Not displayed publicly. | Platform/backoffice only. |

## Manifest contract changes

1. `CountryManifest` gains `commercialReady?: boolean`.
2. `canonicalSignable()` projects the field into the signed bytes.
3. `classify()` and `classifyWithHealth()` block Production when
   `commercialReady !== true`, reporting `regulatory correction pending`.
4. `hasCalculator()` gates the public calculator on the Production tier
   (which now includes commercial readiness).

## UADA impact

`ArchitectureFacts.regulatory` is populated by `ContextAssembler` from the live
pack registry. `ScoreEngine` computes a `regulatory_accuracy` score that drops
for every installed pack not marked `commercialReady: true`.

## Consequences

- Indonesia (v1.9.0) keeps `commercialReady: true` and stays Production.
- Philippines (v1.0.0) is re-declared `commercialReady: false` and drops to
  `Validation` tier until the fiscal correctness remediation (DEBT-022 Phase 1)
  is merged and re-signed.
- The public PH calculator route and any onboarding selection automatically
  block without a separate feature flag.
- Release checklist and CODEOWNERS must verify that a `commercialReady: true`
  declaration is backed by actual engine code and statutory references — not
  just a boolean flip.

## Related

- DEBT-022 (PH Payroll Correctness & Commercial-Readiness Gap)
- `docs/governance/release-process.md`
- `src/lib/packs/catalog.ts`
- `src/lib/uada/score/dimensions.ts`
