# Global Core positioning for the landing page

Reposition the home page from "Indonesian payroll platform" to "global compliance infrastructure with independent country packs". Country-specific vocabulary moves out of the home page entirely and lives only on pack pages.

## 1. Hero — global infrastructure

- Headline: "Global payroll compliance infrastructure, built for every jurisdiction."
- Subtext: "One secure core. Independent country packs. Payroll, tax and statutory compliance delivered through modular compliance engines."
- Primary CTA: "Explore Country Packs" → `/packs`
- Secondary CTA: "Start with Global Core" → `/auth`
- Score card signals become jurisdiction-neutral: "Minimum wage floor respected", "Statutory contributions enrolled", "Tax ID missing on 3 employees".

The hero strings live in the i18n dictionary (EN/ID) used by `useI18n`, so both languages get the new copy.

## 2. Global Core section

Replace the country-flavoured feature cards with the six core capabilities:

- Compliance Core
- Employee lifecycle
- Payroll calculations
- Audit trails
- API integrations
- AI compliance monitoring

Plus a Multi-country architecture note and a dynamic line derived from the catalog already loaded by the route loader:

```text
N packs in production · M in validation or roadmap
```

No new data source — both counts are computed from `Route.useLoaderData()`.

## 3. Country Packs as entry doors

Each production pack card becomes a door into its pack page: flag, name, capability chips from `provides`, version line, and an explicit "Explore {name} →" action linking to `/packs/$country`. Non-production packs render as a compact "Next up" row with their tier label and no link. A single "Explore all country packs" button leads to `/packs`.

## 4. Pricing — global

- Starter feature "Indonesia Country Pack" → "One Country Pack included"
- Per-employee prices in USD: Starter $2 / employee / month, Growth $3.50 / employee / month (same hybrid base + per-seat model)
- Growth gains "Additional country packs on demand"
- Footnote: "cheaper than a single labour-inspection fine" (no Kemenaker)

## 5. Meta

Description: "One global compliance core, independent signed country packs — payroll, tax and statutory compliance across Southeast Asia." Title and og tags follow the same global framing; no country named.

## 6. Country-domain readiness (presentation only)

Add an optional `domain` field to the catalog entry type and populate it per country (`uboardhr.id`, `uboardhr.ph`, …) in the presentation catalog. The landing and `/packs` cards read it only to show a "local site" hint when present; routing stays on `/packs/$country`. This makes the future per-country domain split a config change, not a rewrite. No resolver, no redirect, no DNS work in this sprint.

## Forbidden vocabulary on the home page

NIK, NPWP, BPJS, PPh 21, TER, THR, UMP, Omnibus Law, Kemenaker, IDR pricing. These stay in `/packs/indonesia`, the calculator and the app.

## Technical notes

Files touched: `src/routes/index.tsx` (structure and copy), the i18n dictionary in `src/lib/i18n.tsx` (hero strings, EN + ID), and `src/lib/packs/catalog.ts` only for the optional `domain` field on `CatalogEntry` and the roadmap list. No changes to country packs, the SDK, `/packs/$country` logic, the calculator, pricing logic, backend or routing.
