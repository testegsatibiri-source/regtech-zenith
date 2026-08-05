# Country Packs as a product showcase

Turn the country list into a per-market product vitrine: each card is a compact landing (flag, market, capabilities, coverage, maturity, local site), reused on the home page and on `/packs`.

## 1. Catalog enrichment (presentation only)

`src/lib/packs/catalog.ts` stays the single source of truth. `CatalogEntry` gains presentation fields, all derived or table-driven — no pack, SDK or Core change:

- `region` — "Southeast Asia" per country (static map).
- `complianceAreas: string[]` — short human coverage lines ("Payroll calculation", "Tax compliance", "Employee obligations"), per country map.
- `plannedCapabilities: string[]` — for validation/roadmap markets that have no runtime `provides` yet (Malaysia: Payroll Engine, Tax Framework, Employee Compliance, Statutory Rules; Vietnam, Thailand, Singapore per their planned lists).
- `statusLabel` — derived from the existing tier: `production` → "Production", `beta` → "Validation", `roadmap` → "Roadmap".

The existing cumulative gate (status, version, signature, live health) keeps deciding the tier. Nothing about promotion logic changes.

Capability chips for production packs keep coming from the runtime manifest `provides`, rendered with friendly labels (payroll → Payroll, tax → Tax Engine, benefits → Benefits, contributions → Social Contributions, thirteenth → Statutory Bonuses, audit → Audit Validation, rules → Compliance Rules).

## 2. Shared `CountryPackCard` component

New `src/components/packs/CountryPackCard.tsx` with three visual densities, so home and `/packs` never drift:

- `variant="production"` — flag, name, region, status dot + "Production", `XX Pack vN.N.N`, "Local site: uboardhr.xx", checked capability list, Coverage lines, "Explore {name} →" linking to `/packs/$country`.
- `variant="validation"` — compact card: flag, name, "Validation" badge, planned capabilities, "Coming soon", no link.
- `variant="roadmap"` — minimal row/chip under a "Next markets" heading, with planned capabilities on the pack page listing.

## 3. Home page section

`src/routes/index.tsx` replaces the current pack grid with a titled section:

- Heading: "Compliance intelligence for every jurisdiction"
- Sub: "Each Country Pack contains local payroll rules, tax engines, statutory requirements and compliance workflows — connected to the same global core."
- Production cards (full variant, 2-up), then a "Coming soon" row of validation cards, then a "Next markets" chip row for roadmap, then "Explore all country packs" → `/packs`.

Everything renders from the loader catalog; adding a country stays a catalog-only change.

## 4. `/packs` page

`src/routes/packs.index.tsx` reuses the same card component for its three groups, so the listing and the home showcase look identical. Group copy updated to Production / Validation / Roadmap.

## 5. Domains

`domain` already exists in the catalog and is shown as "Local site: uboardhr.xx". Routing stays `/packs/$country`; no resolver, redirect or DNS work in this sprint.

## Out of scope

No changes to pack engines, SDK, signing, `/packs/$country` gate logic, pricing, backend or routing. Roadmap phases beyond the visual model (Q4 markets, 2027 expansion) are documentation, not code.
