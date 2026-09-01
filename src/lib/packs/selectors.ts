/**
 * H19 — pure surface selectors.
 *
 * PRINCIPLE (frozen): Country Pack availability is evaluated at runtime from
 * the same classification pipeline across every surface. Regional filtering
 * only scopes the result; it never defines availability.
 *
 *                   catalog / manifests
 *                           |
 *                  classifyWithHealth()
 *                           |
 *                  classified pack set
 *                 /                    \
 *          regional filter        production filter
 *                 |                      |
 *          Landing / Packs      Onboarding / New Company
 *
 * These functions are pure: they take an already-classified catalog and only
 * narrow it. They never re-derive tier, health, version or signature.
 */
import type { CatalogEntry } from "@/lib/packs/catalog";
import { toAvailablePack, type AvailablePack } from "./onboarding-contract";

export function regionSlug(region: string): string {
  return region
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * A region query matches when it equals the slug or is contained in it, so
 * `asia` scopes to `southeast-asia`. Matching NEVER changes classification.
 */
export function matchesRegion(entry: CatalogEntry, region?: string): boolean {
  if (!region) return true;
  const q = regionSlug(region);
  if (!q) return true;
  const slug = regionSlug(entry.region);
  return slug === q || slug.includes(q);
}

/**
 * Showcase surface (landing, /packs, regional pages): every classified pack
 * in scope, whatever its status. A pack can be visible here and NOT be
 * selectable — that is invariant I4.
 */
export function selectRegionalCatalog(catalog: CatalogEntry[], region?: string): CatalogEntry[] {
  return catalog.filter((e) => matchesRegion(e, region));
}

/**
 * Selection surface (onboarding, New Company, createCompany revalidation):
 * production-grade packs only, i.e. the cumulative gate passed including live
 * health. Region, when supplied, only scopes this set.
 */
export function selectAvailablePacks(catalog: CatalogEntry[], region?: string): AvailablePack[] {
  return catalog
    .filter((e) => e.tier === "production" && matchesRegion(e, region))
    .map(toAvailablePack);
}
