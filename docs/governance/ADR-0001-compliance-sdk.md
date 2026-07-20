# ADR-0001 — Compliance SDK

**Status:** Accepted (Sprint H5, 2026-07-20)

## Context
The Core previously imported Indonesia-specific modules directly (`ID_PARAMS`,
`id-pack`, `obligations.catalog`). Adding MY/SG/PH would require touching
Core code for every new country — the opposite of a platform.

## Decision
Introduce `src/sdk/` as the **Compliance SDK**: pure contracts (no I/O, no
React, no Supabase). Each country ships a `CountryPack` implementing typed
Providers (`Tax`, `Benefits`, `Payroll`, `Thirteenth`, `Calendar`,
`Contract`, `Rule`, `Audit`). A `CountryRuntime` installs packs, validates
`requiresCore`, and exposes `supports(capability)` for capability discovery.

## Consequences
- Core references packs only through `CountryRuntime.get(companyCountry)`.
- New country = new folder under `src/packs/<country>/`; no Core change.
- Legacy modules under `src/lib/engines/*` remain as adapters until callers
  migrate (tracked in `docs/tech-debt.md`).
