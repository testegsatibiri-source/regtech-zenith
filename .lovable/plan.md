# Country Packs as a product showcase

Turn the country list into a Country Pack Marketplace: each market is a modular product inside the Global Core, rendered by one card component reused on the home page and `/packs`.

## 1. Catalog as product registry

`src/lib/packs/catalog.ts` stays the single source of truth, with a clean split between runtime facts and marketing metadata:

- **Runtime (from the pack manifest, untouched):** `provides`, `version`, `rulesetVersion`, `signed`, `status`, live `health`.
- **Presentation (from the catalog only):** `region`, `complianceAreas`, `plannedCapabilities`, `locales`, `domain`, `statusLabel`.

Marketing copy can therefore evolve without touching the SDK or any pack.

New/extended fields on `CatalogEntry`:

- `region` — "Southeast Asia" per country (static map).
- `complianceAreas: string[]` — coverage lines ("Payroll calculation", "Tax compliance", "Employee obligations").
- `plannedCapabilities: string[]` — for validation/roadmap markets with no runtime engines (Malaysia: Payroll Engine, Tax Framework, Employee Compliance, Statutory Rules; Vietnam, Thailand, Singapore per their planned lists).
- `locales` — from the manifest when installed, from the catalog map otherwise.
- `statusLabel` — derived from the existing tier: `production` → "Production", `beta` → "Validation", `roadmap` → "Roadmap".

The existing cumulative gate (status, version, signature, live health) keeps deciding the tier. Promotion logic does not change.

## 2. Friendly capability mapping

One central map in the catalog module, no strings scattered across components:

`payroll → Payroll`, `tax → Tax Engine`, `benefits → Benefits`, `contributions → Social Contributions`, `thirteenth → Statutory Bonuses`, `audit → Audit Validation`, `rules → Compliance Rules`, plus a title-case fallback for unknown capabilities.

## 3. Shared `CountryPackCard` component

New `src/components/packs/CountryPackCard.tsx`, used by home, `/packs`, and any future regional page — the card is never duplicated.

- `variant="production"` — flag, name, region, status dot + "Production", `XX Pack vN.N.N`, checked capability list from runtime `provides`, "Coverage" lines from `complianceAreas`, "Local site: uboardhr.xx" when `domain` exists, "Explore {name} →" linking to `/packs/$country`.
- `variant="validation"` — compact: flag, name, "Validation" badge, planned capabilities, "Coming soon". No version, no runtime capabilities, no link.
- `variant="roadmap"` — minimal chip/row under "Next markets"; planned capabilities are shown only on `/packs`.

## 4. Home page section

`src/routes/index.tsx` replaces the current pack grid with:

- Heading: "Compliance intelligence for every jurisdiction"
- Sub: "Each Country Pack contains local payroll rules, tax engines, statutory requirements and compliance workflows — connected to the same global core."
- Production cards (2-up) → Validation cards → "Next markets" chips → "Explore all country packs" → `/packs`.

Everything renders from the loader catalog; adding a market stays a catalog-only change.

## 5. `/packs` as the commercial catalog

`src/routes/packs.index.tsx` reuses the same component for Production / Validation / Roadmap groups — same data, same presentation, no duplicated logic.

## 6. Local domains

`domain` stays presentation-only: shown as "Local site: uboardhr.xx". The official route remains `/packs/$country`. A future `uboardhr.id → country=id` resolver needs no architectural change; no resolver, redirect or DNS work in this sprint.

## Acceptance criteria

Home: no country-specific rule vocabulary; all cards from the catalog; Production / Validation / Roadmap visually separated; flag, capabilities, coverage and local site shown when present.
`/packs`: reuses `CountryPackCard`, identical presentation to the home showcase, no duplicated logic.

## Out of scope

No changes to pack engines, SDK, signing, health gate, promotion logic, `/packs/$country` gate, pricing, backend or routing. Long-term region → country → pack hierarchy and 2027 market expansion are direction, not code in this sprint.
