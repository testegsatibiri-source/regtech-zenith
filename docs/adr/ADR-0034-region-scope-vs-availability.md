# ADR-0034 — Region is scope, availability is runtime

Status: Accepted (Sprint H19)

## Principle

> Country Pack availability is evaluated at runtime from the same
> classification pipeline across every surface. Regional filtering only scopes
> the result; it never defines availability.

## Decision

One `classifyWithHealth()` pass per request feeds two derived surfaces:

```text
                  catalog / manifests
                          |
                 classifyWithHealth()
                          |
                 classified pack set
             +------------+-------------+
             |                          |
       regional filter            production filter
             |                          |
        Landing / Packs       Onboarding / New Company
             +------------+-------------+
                          |
                   CountryPackCard
                          |
                    createCompany
                          |
                  backend revalidation
```

- `getRegionalPackCatalog({ region })` — showcase contract. Returns every
  classified pack in scope with its runtime status.
- `getAvailableProductionPacks({ region })` — selection contract. Returns
  `AvailablePack[]`, production + healthy only.
- `assertPackAvailable()` remains the backend authority at `createCompany`.

## Invariants (tested in `src/lib/packs/__tests__/h19-invariants.test.ts`)

- **I1** Landing, `/packs`, onboarding and New Company never classify
  independently.
- **I2** One classification per request is consumed by all surfaces.
- **I3** Region filtering cannot change `status`, `tier`, `health` or manifest
  version — it only reduces the set.
- **I4** Selection is strictly more restrictive than the showcase: a pack may
  be visible and not selectable (e.g. Malaysia in validation).

## Presentation

`CountryPackCard` is the only card. `variant` is optional and derived from
`pack.tier` via `variantForTier()`. Status strings are never hardcoded, and no
`AsiaCountryCard`-style fork is allowed.

## Degradation contract

If Philippines degrades from `production + healthy` to `production + warn`, the
showcase re-renders it as Validation on the next request while onboarding and
New Company stop offering it, and `createCompany(country_code=PH)` is rejected
server-side even for a stale client.
