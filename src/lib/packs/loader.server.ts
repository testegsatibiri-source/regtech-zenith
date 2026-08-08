/**
 * H18.1 — single source of runtime Country Pack availability.
 *
 * Every surface that needs to know "which jurisdictions can be used right
 * now" MUST go through this module: the public catalog, the onboarding
 * selector, the New Company dialog and the createCompany server function.
 * Availability is evaluated PER REQUEST because it depends on live
 * `health()` (ADR-0032 / ADR-0033).
 */
import { listCatalogWithHealth, type CatalogEntry } from "@/lib/packs/catalog";
import { toAvailablePack, type AvailablePack } from "./onboarding-contract";

/** Full catalog (production + validation + roadmap) for presentation pages. */
export async function loadCatalogForRequest(): Promise<CatalogEntry[]> {
  return listCatalogWithHealth();
}

/** The authoritative availability list: production-grade packs only. */
export async function loadCountryPacksForRequest(): Promise<AvailablePack[]> {
  const catalog = await loadCatalogForRequest();
  return catalog.filter((e) => e.tier === "production").map(toAvailablePack);
}

/**
 * Re-validates a country code at submit time. Protects against the pack
 * degrading between page load and form submission.
 */
export async function assertPackAvailable(countryCode: string): Promise<AvailablePack> {
  const code = countryCode.toUpperCase();
  const pack = (await loadCountryPacksForRequest()).find((p) => p.countryCode === code);
  if (!pack) {
    throw new Error(
      `Country pack "${code}" is not available for production use right now. Pick an available jurisdiction.`,
    );
  }
  return pack;
}
