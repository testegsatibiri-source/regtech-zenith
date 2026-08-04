# Landing page: remove hardcoded Indonesia, make the core global

The pack grid on the landing page is already dynamic (catalog-driven), but the surrounding copy is still Indonesia-only. Confirmed hardcoded spots in `src/routes/index.tsx`:

- Hero score card signals: "Base salary ≥ UMP", "BPJS enrolled", "NPWP missing on 3 employees"
- Architecture cards: "Country Packs" mentions NIK, NPWP, BPJS, THR; "Rule Engines" mentions PPh 21 / TER; "Predictive AI Audit" mentions Omnibus Law
- Pricing: Starter feature "Indonesia Country Pack"; per-seat prices quoted only in IDR; "Kemenaker fine" footnote
- Meta description names Indonesia and the Philippines explicitly

## What changes

1. **Hero signals become jurisdiction-neutral**
   Replace the three fixed Indonesian signals with core-level ones: "Minimum wage floor respected", "Statutory contributions enrolled", "Tax ID missing on 3 employees".

2. **Architecture section describes the core, not one country**
   - Country Packs: "Jurisdiction rules — identifiers, contributions, statutory bonuses — isolated from the business core. Add a country without touching payroll logic."
   - Rule Engines: "Tax, social contributions and statutory bonus engines run independently — sellable as standalone calculation APIs."
   - Predictive AI Audit: "Cross-checks overtime and leave against the active pack's labour limits and flags anomalies before they become fines."
   - Add a live line under "Global Core": "N packs in production · M in validation or roadmap", derived from the catalog already loaded in the route.

3. **Pricing becomes country-agnostic**
   - Starter feature "Indonesia Country Pack" → "One Country Pack included"
   - Per-employee prices in USD (Starter $2 / employee / mo, Growth $3.50 / employee / mo) instead of IDR; keep the hybrid base + per-seat structure
   - Footnote: "cheaper than a single labour-inspection fine" instead of naming Kemenaker
   - Growth gains "Additional country packs on demand"

4. **Meta**
   Description reworded to "One global compliance core, independent signed country packs — payroll, tax and statutory compliance across Southeast Asia." No single country named.

Country-specific detail stays where it belongs: `/packs/$country` pack pages, the calculator, and the app dashboard.

## Technical notes

Scope is `src/routes/index.tsx` only — presentation copy plus a derived count from the existing `Route.useLoaderData()` catalog. No changes to the catalog, packs, SDK, routing, pricing logic or backend.
