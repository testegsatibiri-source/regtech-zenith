import { describe, it, expect } from "vitest";
import { listCatalogWithHealth } from "@/lib/packs/catalog";
import { selectAvailablePacks } from "@/lib/packs/selectors";

/**
 * Landing page invariant: the entry page classifies packs from server-side
 * runtime data only. A regression that re-classifies in the browser (empty
 * runtime) shows "0 packs in production" — these tests fail first.
 */
describe("landing coverage data", () => {
  it("reports the installed jurisdictions as production", async () => {
    const catalog = await listCatalogWithHealth();
    const production = catalog.filter((p) => p.tier === "production").map((p) => p.code);

    expect(production.length).toBeGreaterThan(0);
    expect(production).toContain("ID");
    expect(production).toContain("PH");
  });

  it("keeps the coverage counter consistent with the selection surface", async () => {
    const catalog = await listCatalogWithHealth();
    const available = selectAvailablePacks(catalog).map((p) => p.countryCode).sort();
    const production = catalog
      .filter((p) => p.tier === "production")
      .map((p) => p.code.toUpperCase())
      .sort();

    expect(available).toEqual(production);
  });
});
