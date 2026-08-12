# Global product vs. Country Packs — landing and navigation cleanup

The entry page today mixes three different products in one flat scroll: the global platform, the Indonesian payroll calculator (linked from the main nav), and the pack showcase. It also renders inconsistently — the version you saw said "0 packs in production · 3 in validation or roadmap" and showed only roadmap chips, while the server renders "2 packs in production" with Indonesia and Philippines. That instability is the single worst signal on the page.

## 1. Fix the unstable pack counts (real bug)

`src/routes/index.tsx` loads the catalog with an isomorphic loader that calls `listCatalogWithHealth()` directly. On the server the runtime has Indonesia, Malaysia and Philippines installed; when the same loader re-runs in the browser (client navigation, preload, hydration timing) it can produce a different, empty result — hence "0 packs in production".

Fix: the landing loader calls the existing server function `getPacksPageData()` (already used by `/packs`), so catalog and availability are always evaluated server-side, once, per request. Same treatment for any other public surface that classifies packs in a plain loader.

Add an invariant test asserting the landing loader data always contains the installed jurisdictions with their runtime tier, so a regression to "0 packs" fails CI.

## 2. Clear information architecture

Three distinct product surfaces, never mixed:

```text
Global (English only)          Country Pack (local language)
-----------------------        -----------------------------
/            Platform          /packs             Coverage index
/platform-*  Core capability   /packs/:country    Pack product page
/pricing     Commercial        /packs/:country/calculator
/packs       Coverage map
```

Header navigation becomes: Platform · Country Packs · Pricing · Docs/API, plus Sign in / Start free. The "Calculator" link leaves the global nav — it is a country-pack tool, not a platform feature. The language toggle also leaves the global header (global pages are English-only by decision); it stays inside pack pages via the existing `LocaleScope`.

## 3. Calculator moves under its pack

`/calculator` is an Indonesia-only tool sitting at global level with an Indonesia title. It becomes `/packs/indonesia/calculator`, rendered inside the pack context (flag, pack version, IDR, Indonesian locale) and reachable from a "Try the calculator" action on the Indonesia pack page. `/calculator` stays alive as a permanent redirect so existing links and search results keep working.

Each production pack page gains the same slot, so a pack with a calculator shows one and a pack without simply does not — driven by pack capability, not by hardcoded country checks.

## 4. Landing page restructure

Sections, in order, each with one job:

1. **Hero** — global positioning, two CTAs: "Explore Country Packs" and "Start free". Keep the compliance-score card, jurisdiction-neutral signals.
2. **How it works** — a three-step band: Global Core → Country Pack → Compliance evidence. This is the concept the current page never states plainly.
3. **Global Core capabilities** — the six capability cards, unchanged in substance.
4. **Coverage** — a single, clean jurisdiction block: production packs as cards with flag, version, capability chips and an explicit "Explore {country} →"; validation and roadmap as compact rows underneath; one "Explore all country packs" button. The dynamic line reads from the same server data ("2 packs in production · 4 in validation or roadmap").
5. **For developers** — API / SDK / signed packs, linking to `/api-docs`.
6. **Pricing** — moved to a dedicated `/pricing` route with its own metadata; the landing keeps a three-card summary that links there.
7. **Footer** — three columns: Product, Country Packs (generated from the catalog), Company/Legal.

Nothing country-specific appears above the Coverage section, and no Indonesian vocabulary appears anywhere on the global pages.

## 5. Consistency pass

- Every global route gets its own `head()` (title, description, og:title, og:description); `/pricing` and `/packs/indonesia/calculator` are new and need theirs.
- Header CTA labels stop coming from the i18n hero dictionary and use fixed English strings on global pages.
- Sitemap gains `/pricing` and the per-pack calculator routes; `/calculator` is excluded once it redirects.

## Technical notes

Files touched: `src/routes/index.tsx` (loader source + restructure), new `src/routes/pricing.tsx`, new `src/routes/packs.$country.calculator.tsx`, `src/routes/calculator.tsx` (becomes a redirect), `src/components/SiteHeader.tsx` (nav, no lang toggle), a new footer component, `src/routes/sitemap[.]xml.ts`, and a new landing invariant test. No changes to the SDK, the country packs, pricing logic, backend, RLS or the authenticated app.

## Out of scope

Pricing numbers stay as they are today. No new jurisdictions, no design-system change, no per-country domains.
