/**
 * H18.0 — Onboarding contract freeze.
 *
 * `AvailablePack` is the ONLY shape that crosses the boundary between the
 * runtime availability loader and any selection surface (/onboarding,
 * New Company, /packs). It carries no tier logic: if a pack is in this list
 * it is production-grade at this request, period.
 */
export interface AvailablePack {
  /** ISO-3166 alpha-2, uppercase. */
  countryCode: string;
  name: string;
  /** Derived from the pack manifest — never supplied by a client. */
  currency: string;
  /** Frozen literal: only production packs are ever emitted. */
  status: "production";
  /** Absolute flag image URL (presentation only). */
  flagAsset: string;
}

export function flagAssetFor(countryCode: string): string {
  return `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;
}

/** Minimal input the mapper needs — structurally satisfied by CatalogEntry. */
export interface AvailablePackSource {
  code: string;
  name: string;
  currency: string;
  tier: string;
}

/** Maps a catalog entry to the frozen contract. Production packs only. */
export function toAvailablePack(entry: AvailablePackSource): AvailablePack {
  return {
    countryCode: entry.code.toUpperCase(),
    name: entry.name,
    currency: entry.currency,
    status: "production",
    flagAsset: flagAssetFor(entry.code),
  };
}
