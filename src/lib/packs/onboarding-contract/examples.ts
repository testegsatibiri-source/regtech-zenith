import type { AvailablePack, AvailablePackSource } from "./index";

/**
 * Frozen example (H18.0). Three catalog entries go in — one production, one
 * beta, one roadmap — and exactly one AvailablePack comes out. Any change to
 * this expectation is a contract change and needs an ADR.
 */
export const EXAMPLE_CATALOG_SOURCE: AvailablePackSource[] = [
  { code: "ID", name: "Indonesia", currency: "IDR", tier: "production" },
  { code: "MY", name: "Malaysia", currency: "MYR", tier: "beta" },
  { code: "VN", name: "Vietnam", currency: "VND", tier: "roadmap" },
];

export const EXAMPLE_AVAILABLE_PACKS: AvailablePack[] = [
  {
    countryCode: "ID",
    name: "Indonesia",
    currency: "IDR",
    status: "production",
    flagAsset: "https://flagcdn.com/w80/id.png",
  },
];
