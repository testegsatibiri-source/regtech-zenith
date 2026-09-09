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
  const pack = catalog.find((e) => e.code === "ID");
  if (!pack) throw new Error("Indonesia Country Pack is not installed");
  return { pack };
});
