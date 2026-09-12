import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { listCatalogWithHealth, type CatalogEntry } from "@/lib/packs/catalog";
import { CountryPackCard, RoadmapPackCard } from "@/components/packs/CountryPackCard";

/**
 * Card presentation invariants: capabilities and destinations come from the
 * runtime catalog, never from strings written into the component.
 */
describe("country pack card navigation", () => {
  it("shows the runtime capabilities of the installed ID pack instead of a placeholder", async () => {
    const catalog = await listCatalogWithHealth();
    const id = catalog.find((p) => p.code === "ID") as CatalogEntry;

    expect(id.installed).toBe(true);
    expect(id.provides.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(<CountryPackCard pack={id} />);

    expect(html).toContain("Capabilities");
    expect(html).not.toContain("Coming soon");
  });

  it("links the ID card to the published local landing", async () => {
    const catalog = await listCatalogWithHealth();
    const id = catalog.find((p) => p.code === "ID") as CatalogEntry;

    expect(id.landingPath).toBe("/id");

    const html = renderToStaticMarkup(<CountryPackCard pack={id} />);
    expect(html).toContain('href="/id"');
    expect(html).toContain("Visit local site");
  });

  it("keeps roadmap markets non-clickable", async () => {
    const catalog = await listCatalogWithHealth();
    const roadmap = catalog.find((p) => p.tier === "roadmap") as CatalogEntry;

    const html = renderToStaticMarkup(<RoadmapPackCard pack={roadmap} />);

    expect(html).not.toContain("<a ");
    expect(html).toContain("Under construction");
  });
});
