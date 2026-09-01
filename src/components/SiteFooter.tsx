import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { CatalogEntry } from "@/lib/packs/catalog";

/**
 * Global footer. Country columns are generated from the catalog: adding a
 * jurisdiction never requires editing this file.
 */
export function SiteFooter({ packs = [] }: { packs?: CatalogEntry[] }) {
  const production = packs.filter((p) => p.tier === "production");

  return (
    <footer className="border-t border-border bg-muted/20 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-accent" /> UBoard Asia
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Global payroll compliance infrastructure. One secure core, independent signed country
            packs.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Product</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="/#platform" className="hover:text-foreground">
                Global Core
              </a>
            </li>
            <li>
              <a href="/#architecture" className="hover:text-foreground">
                Architecture &amp; trust
              </a>
            </li>
            <li>
              <Link to="/packs" className="hover:text-foreground">
                Country Packs
              </Link>
            </li>
            <li>
              <Link to="/api-docs" className="hover:text-foreground">
                API &amp; SDK
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Jurisdictions</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {production.map((p) => (
              <li key={p.code}>
                <Link
                  to="/packs/$country"
                  params={{ country: p.code.toLowerCase() }}
                  className="hover:text-foreground"
                >
                  {p.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/packs" className="hover:text-foreground">
                All coverage
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-4 text-xs text-muted-foreground">
        © {new Date().getFullYear()} UBoard Asia — Compliance &amp; Payroll as a Service.
      </div>
    </footer>
  );
}
