import { describe, it, expect } from "vitest";
import { listCatalogWithHealth } from "@/lib/packs/catalog";
import { selectAvailablePacks } from "@/lib/packs/selectors";

/**
 * Landing page invariant: the entry page classifies packs from server-side
 * runtime data only. A regression that re-classifies in the browser (empty
 * runtime) shows "0 packs in production" — these tests fail first.
 */
describe("landing coverage data", () => {
  it("reports only commercial-ready packs as production", async () => {
    const catalog = await listCatalogWithHealth();
    const production = catalog.filter((p) => p.tier === "production").map((p) => p.code);
    const ph = catalog.find((p) => p.code === "PH");

    expect(production.length).toBeGreaterThan(0);
    expect(production).toContain("ID");
    // H20: PH is structurally sound but not yet commercially ready.
    expect(production).not.toContain("PH");
    expect(ph?.blockers).toEqual(
      expect.arrayContaining([expect.stringContaining("regulatory correction pending")]),
    );
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
