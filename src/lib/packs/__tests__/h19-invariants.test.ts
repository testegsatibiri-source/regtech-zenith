import { describe, it, expect } from "vitest";
import type { CatalogEntry } from "@/lib/packs/catalog";
import {
  selectAvailablePacks,
  selectRegionalCatalog,
  matchesRegion,
} from "@/lib/packs/selectors";
import { variantForTier } from "@/components/packs/CountryPackCard";

function entry(over: Partial<CatalogEntry> & Pick<CatalogEntry, "code">): CatalogEntry {
  return {
    name: over.code,
    flag: "🏳️",
    currency: "USD",
    tier: "production",
    statusLabel: "Production",
    region: "Southeast Asia",
    installed: true,
    signed: true,
    provides: [],
    complianceAreas: [],
    plannedCapabilities: [],
    languages: [],
    blockers: [],
    health: "ok",
    ...over,
  } as CatalogEntry;
}

/** Classified set produced by one classifyWithHealth() pass. */
const STATE_A: CatalogEntry[] = [
  entry({ code: "ID", name: "Indonesia", currency: "IDR" }),
  entry({ code: "PH", name: "Philippines", currency: "PHP" }),
  entry({ code: "MY", name: "Malaysia", currency: "MYR", tier: "beta", statusLabel: "Validation", health: "warn", blockers: ["pre-1.0"] }),
  entry({ code: "BR", name: "Brazil", currency: "BRL", region: "South America" }),
  entry({ code: "VN", name: "Vietnam", currency: "VND", tier: "roadmap", statusLabel: "Roadmap", installed: false, signed: false }),
];

/** Same runtime, PH health degraded. */
const STATE_B: CatalogEntry[] = STATE_A.map((e) =>
  e.code === "PH"
    ? { ...e, tier: "beta" as const, statusLabel: "Validation", health: "warn" as const, blockers: ['health check is "degraded"'] }
    : e,
);

describe("H19 — runtime invariants", () => {
  it("I1/I2 — every surface consumes one classified set", () => {
    const showcase = selectRegionalCatalog(STATE_A, "asia");
    const selectable = selectAvailablePacks(STATE_A, "asia");
    for (const p of selectable) {
      const shown = showcase.find((e) => e.code === p.countryCode)!;
      expect(shown.tier).toBe("production");
      expect(shown.currency).toBe(p.currency);
    }
  });

  it("I3 — region only reduces the set, never mutates classification", () => {
    const all = selectRegionalCatalog(STATE_A);
    const asia = selectRegionalCatalog(STATE_A, "asia");
    expect(asia.length).toBeLessThan(all.length);
    for (const e of asia) {
      const src = all.find((a) => a.code === e.code)!;
      expect(e).toEqual(src);
      expect(e.tier).toBe(src.tier);
      expect(e.health).toBe(src.health);
      expect(e.version).toBe(src.version);
    }
    expect(matchesRegion(STATE_A[3]!, "asia")).toBe(false);
  });

  it("I4 — selection is strictly more restrictive than the showcase", () => {
    const showcaseCodes = selectRegionalCatalog(STATE_A, "asia").map((e) => e.code);
    const selectableCodes = selectAvailablePacks(STATE_A, "asia").map((p) => p.countryCode);
    expect(showcaseCodes).toContain("MY"); // validation appears
    expect(selectableCodes).not.toContain("MY"); // but is not selectable
    expect(selectableCodes.every((c) => showcaseCodes.includes(c))).toBe(true);
  });

  it("status badges are derived from the runtime tier, never hardcoded", () => {
    expect(variantForTier("production")).toBe("production");
    expect(variantForTier("beta")).toBe("validation");
    expect(variantForTier("roadmap")).toBe("roadmap");
  });
});

describe("H19.5 — production -> degraded transition (PH)", () => {
  it("state A: PH is production on the showcase and selectable", () => {
    expect(selectRegionalCatalog(STATE_A, "asia").find((e) => e.code === "PH")!.tier).toBe("production");
    expect(selectAvailablePacks(STATE_A, "asia").map((p) => p.countryCode)).toContain("PH");
  });

  it("state B: PH stays on the showcase as validation but is NOT selectable", () => {
    const shown = selectRegionalCatalog(STATE_B, "asia").find((e) => e.code === "PH")!;
    expect(shown.tier).toBe("beta");
    expect(shown.health).toBe("warn");
    expect(selectAvailablePacks(STATE_B, "asia").map((p) => p.countryCode)).not.toContain("PH");
  });

  it("no AvailablePack ever leaks a non-production status", () => {
    for (const state of [STATE_A, STATE_B]) {
      expect(selectAvailablePacks(state).every((p) => p.status === "production")).toBe(true);
    }
  });
});
