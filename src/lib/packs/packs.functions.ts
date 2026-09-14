import { createServerFn } from "@tanstack/react-start";

/**
 * Thin RPC wrappers around the single availability loader (H18.1).
 * Client surfaces never import the loader directly.
 */
export const getAvailableCountryPacks = createServerFn({ method: "GET" }).handler(async () => {
  const { loadCountryPacksForRequest } = await import("@/lib/packs/loader.server");
  return loadCountryPacksForRequest();
});

export const getPacksPageData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadCatalogForRequest, loadCountryPacksForRequest } =
    await import("@/lib/packs/loader.server");
  const [catalog, available] = await Promise.all([
    loadCatalogForRequest(),
    loadCountryPacksForRequest(),
  ]);
  return { catalog, available };
});

/**
 * H17-ID — Indonesia landing data. The status badge, ruleset version and pack
 * version all come from the runtime catalog; the page never hardcodes them.
 */
export const getIdLandingData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadCatalogForRequest } = await import("@/lib/packs/loader.server");
  const catalog = await loadCatalogForRequest();
  // Defensive: if the pack is unavailable the page still renders with an
  // explicit "status unavailable" badge instead of a 500 (H17-ID fix).
  const pack = catalog.find((e) => e.code === "ID") ?? null;
  return { pack };
});
