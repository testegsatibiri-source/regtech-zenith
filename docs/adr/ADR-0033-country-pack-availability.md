# ADR-0033 — Single runtime source for Country Pack availability

Status: Accepted (Sprint H18)

## Context

Availability of a Country Pack was decided in two places: the public catalog
pages called `listCatalogWithHealth()` directly, while company creation
defaulted to a hardcoded `country_code: "ID"` with a client-supplied currency.
Two sources of truth mean a degraded pack could still be selected during
onboarding.

## Decision

1. `src/lib/packs/onboarding-contract` freezes `AvailablePack`
   (`countryCode`, `name`, `currency`, `status: "production"`, `flagAsset`)
   plus a frozen example. Changing the shape requires a new ADR.
2. `src/lib/packs/loader.server.ts` is the ONLY place that decides
   availability, evaluated per request via `classifyWithHealth()`:
   - `loadCountryPacksForRequest()` — production packs only.
   - `assertPackAvailable(code)` — re-validation at submit time.
3. `/packs`, `/onboarding` and the New Company dialog all consume that loader
   through the server functions in `src/lib/packs/packs.functions.ts`.
4. `createCompany` no longer accepts a currency or defaults a country: it
   validates the country against the loader and derives the currency from the
   pack manifest.
5. Users without a company are redirected to `/onboarding` by the
   `_authenticated` layout — the rule exists in exactly one place.

## Consequences

- A pack failing `health()` disappears simultaneously from the public catalog
  and from every selection surface, within the same request.
- `CountryPackSelector` is pure presentation and holds no eligibility rule.
- DEBT-023: a legacy `currency` field in the createCompany payload is accepted
  and ignored for backwards compatibility; remove once no client sends it.
