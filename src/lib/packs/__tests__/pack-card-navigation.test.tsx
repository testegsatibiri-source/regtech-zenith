import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

    render(<CountryPackCard pack={id} />);

    expect(screen.getByText("Capabilities")).toBeTruthy();
    expect(screen.queryByText("Coming soon")).toBeNull();
  });

  it("links the ID card to the published local landing", async () => {
    const catalog = await listCatalogWithHealth();
    const id = catalog.find((p) => p.code === "ID") as CatalogEntry;

    expect(id.landingPath).toBe("/id");

    render(<CountryPackCard pack={id} />);
    const link = screen.getByRole("link", { name: /visit local site/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/id");
  });

  it("keeps roadmap markets non-clickable", async () => {
    const catalog = await listCatalogWithHealth();
    const roadmap = catalog.find((p) => p.tier === "roadmap") as CatalogEntry;

    render(<RoadmapPackCard pack={roadmap} />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Under construction")).toBeTruthy();
  });
});
