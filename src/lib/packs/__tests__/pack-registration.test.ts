// Regression: the production bundle once tree-shook the side-effect-only
// `import "@/sdk/bootstrap"`, leaving the catalog empty on the published site
// (home showed 0 packs, /id returned 500). The catalog must register packs
// explicitly, without relying on any other module having imported bootstrap.
import { describe, expect, it } from "vitest";
import { listCatalog, listCatalogWithHealth } from "../catalog";

const EXPECTED = ["ID", "MY", "PH"];

describe("country pack registration", () => {
  it("lists the installed packs from a bare catalog import", () => {
    const codes = listCatalog().map((e) => e.code);
    for (const code of EXPECTED) expect(codes).toContain(code);
  });

  it("keeps the installed packs in the health-gated catalog", async () => {
    const entries = await listCatalogWithHealth();
    for (const code of EXPECTED) {
      const entry = entries.find((e) => e.code === code);
      expect(entry, `${code} missing from catalog`).toBeDefined();
      expect(entry!.tier).not.toBe("roadmap");
      expect(entry!.version).toBeTruthy();
    }
  });
});
