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
