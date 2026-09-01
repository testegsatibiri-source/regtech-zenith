/**
 * H18.1 / H19 — single source of runtime Country Pack availability.
 *
 * Every surface that needs to know "which jurisdictions exist and which can
 * be used right now" MUST go through this module: the public showcase, the
 * onboarding selector, the New Company dialog and the createCompany server
 * function. Availability is evaluated PER REQUEST because it depends on live
 * `health()` (ADR-0032 / ADR-0033 / ADR-0034).
 *
 * Both surfaces derive from ONE classifyWithHealth() pass per call:
 *   classified set -> regional filter  -> showcase
 *                  -> production filter -> selection
 */
import { listCatalogWithHealth, type CatalogEntry } from "@/lib/packs/catalog";
import { selectAvailablePacks, selectRegionalCatalog } from "./selectors";
import type { AvailablePack } from "./onboarding-contract";

export interface RegionScope {
  /** Scope only. Never influences status, tier, health or version. */
  region?: string;
}

/** Full classified catalog (production + validation + roadmap). */
export async function loadCatalogForRequest(): Promise<CatalogEntry[]> {
  return listCatalogWithHealth();
}

/**
 * Showcase contract: every classified pack in the region, with the runtime
 * status attached. Consumers render `entry.tier` / `entry.statusLabel` — they
 * must never hardcode a status string.
 */
export async function getRegionalPackCatalog(scope: RegionScope = {}): Promise<CatalogEntry[]> {
  return selectRegionalCatalog(await loadCatalogForRequest(), scope.region);
}

/** Selection contract: production + healthy only, optionally region-scoped. */
export async function getAvailableProductionPacks(
  scope: RegionScope = {},
): Promise<AvailablePack[]> {
  return selectAvailablePacks(await loadCatalogForRequest(), scope.region);
}

/** Back-compat alias kept for H18 call sites. */
export const loadCountryPacksForRequest = getAvailableProductionPacks;

/**
 * Backend authority: re-validates a country code at submit time. Protects
 * against the pack degrading between page load and form submission, even if
 * a stale client still shows it as selectable.
 */
export async function assertPackAvailable(countryCode: string): Promise<AvailablePack> {
  const code = countryCode.toUpperCase();
  const pack = (await getAvailableProductionPacks()).find((p) => p.countryCode === code);
  if (!pack) {
    throw new Error(
      `Country pack "${code}" is not available for production use right now. Pick an available jurisdiction.`,
    );
  }
  return pack;
}
