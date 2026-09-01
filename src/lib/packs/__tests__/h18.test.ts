import { describe, it, expect } from "vitest";
import { toAvailablePack, flagAssetFor } from "@/lib/packs/onboarding-contract";
import {
  EXAMPLE_CATALOG_SOURCE,
  EXAMPLE_AVAILABLE_PACKS,
} from "@/lib/packs/onboarding-contract/examples";
import { loadCountryPacksForRequest, assertPackAvailable } from "@/lib/packs/loader.server";

describe("H18 — onboarding contract", () => {
  it("maps only production entries, exactly as frozen in the example", () => {
    const out = EXAMPLE_CATALOG_SOURCE.filter((e) => e.tier === "production").map(toAvailablePack);
    expect(out).toEqual(EXAMPLE_AVAILABLE_PACKS);
  });

  it("always emits an uppercase code and a lowercase flag asset", () => {
    const p = toAvailablePack({
      code: "ph",
      name: "Philippines",
      currency: "PHP",
      tier: "production",
    });
    expect(p.countryCode).toBe("PH");
    expect(p.flagAsset).toBe(flagAssetFor("PH"));
    expect(p.status).toBe("production");
  });
});

describe("H18 — runtime availability parity", () => {
  it("exposes only production packs, with no tier leakage", async () => {
    const packs = await loadCountryPacksForRequest();
    expect(packs.every((p) => p.status === "production")).toBe(true);
    expect(packs.every((p) => p.countryCode === p.countryCode.toUpperCase())).toBe(true);
    expect(packs.every((p) => p.currency.length > 0)).toBe(true);
  });

  it("accepts an available pack and rejects an unavailable one", async () => {
    const packs = await loadCountryPacksForRequest();
    if (packs.length > 0) {
      const first = packs[0]!;
      await expect(assertPackAvailable(first.countryCode.toLowerCase())).resolves.toMatchObject({
        countryCode: first.countryCode,
      });
    }
    await expect(assertPackAvailable("ZZ")).rejects.toThrow(/not available/i);
  });
});
