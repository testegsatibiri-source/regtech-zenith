# ADR-0038 — Commercial readiness includes privacy-law defensibility

- **Status:** Accepted (Sprint H23)
- **Date:** 2026-08-30
- **Deciders:** Platform, Compliance, Legal

## Context

ADR-0035 introduced `commercialReady` as a signed manifest gate that separates structurally sound packs from packs whose calculation engines are backed by real statutory tables. The Philippines remediation (H20) showed that a pack can be structurally healthy and legally wrong at the same time.

A second axis of risk exists and is independent of fiscal correctness: **privacy-law defensibility**. The Country Pack for Indonesia currently stores national identification numbers (NIK), tax identifiers (NPWP) and bank-account data in plaintext inside `country_metadata`. Indonesia's Personal Data Protection Law (UU PDP, Law 27/2022) entered active enforcement in 2024 and treats national identification data more strictly than generic personal data.

A buyer evaluating the system as a payroll/compliance OS must be able to trust that `commercialReady: true` means both:

1. the statutory calculation tables are real and sourced from published regulations; and
2. the handling of employee personal data is legally defensible in the pack's jurisdiction.

## Decision

Extend the `commercialReady` criterion in ADR-0035 to include a privacy-law readiness requirement:

```text
commercialReady = true  ⟹  (fiscal_correctness  ∧  privacy_defensibility)
```

For a Country Pack to be classified as `production`:

- All statutory parameters must be reconciled against primary sources or explicitly marked `needs-review` (existing ADR-0035 rule).
- Personal-data categories defined as sensitive or high-risk by the jurisdiction must either:
  - be encrypted at the field level with a key managed separately from the database, or
  - be covered by a **signed legal opinion** that explicitly permits plaintext storage in the interim.

The legal-opinion exception is intentionally narrow:

- It must be issued by a lawyer **licensed in the pack's jurisdiction** with concentrated practice in the applicable data-protection law.
- For Indonesia, the opinion must come from an Indonesian advocate licensed to practice (PKPA / PERADI where applicable) with specific UU PDP experience.
- The opinion must name the exact data elements stored in plaintext (NIK, NPWP, bank account), analyse residency, cross-border transfer, incident-notification and retention obligations, and state a binding conclusion with an expiry date and revision condition.
- The opinion is versioned in `docs/governance/legal-opinions/<pack>-<date>.md` and referenced by ADR-0038; it is **not** a code flag.

## Consequences

- Indonesia `commercialReady` remains `false` until H23 Phase D closes, unless a qualifying legal opinion is produced and recorded.
- The UADA Architecture Score's `regulatory_accuracy` dimension now also reflects missing field-level encryption for sensitive identifiers.
- Product and engineering cannot override the gate by flipping a boolean; only a recorded legal opinion can create a time-bounded exception.
- Other Country Packs are subject to the same extended criterion from the moment they declare `commercialReady`.

## Related

- ADR-0035 — Commercial readiness is a distinct, signed classification gate
- docs/governance/legal-opinion-template.md
- DEBT-024 (ID UMP/UMK staleness)
- H23 Phase D — UU PDP and field-level encryption
