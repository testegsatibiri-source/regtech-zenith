import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountryFlag } from "@/components/packs/CountryFlag";
import { capabilityLabel, type CatalogEntry } from "@/lib/packs/catalog";

export type PackCardVariant = "production" | "validation" | "roadmap";

/** Presentation derives from the runtime classification — never hardcoded. */
export function variantForTier(tier: CatalogEntry["tier"]): PackCardVariant {
  if (tier === "production") return "production";
  if (tier === "roadmap") return "roadmap";
  return "validation";
}

/**
 * Single presentation of a Country Pack, shared by the landing showcase,
 * /packs and any future regional page. Never duplicate this card.
 * `variant` is presentation-only; when omitted it is derived from pack.tier.
 */
export function CountryPackCard({ pack, variant }: { pack: CatalogEntry; variant?: PackCardVariant }) {
  const v = variant ?? variantForTier(pack.tier);
  if (v === "roadmap") return <RoadmapCard pack={pack} />;
  if (v === "validation") return <ValidationCard pack={pack} />;
  return <ProductionCard pack={pack} />;
}


function ProductionCard({ pack }: { pack: CatalogEntry }) {
  return (
    <Card className="group flex h-full flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CountryFlag code={pack.code} name={pack.name} className="h-7 w-10" />
            <h3 className="mt-2 font-display text-lg font-semibold">{pack.name}</h3>
            <p className="text-xs text-muted-foreground">{pack.region}</p>
          </div>
          <Badge className="shrink-0 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {pack.statusLabel}
          </Badge>
        </div>

        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {pack.code} Pack v{pack.version}
        </p>

        {pack.provides.length > 0 && (
          <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
            {pack.provides.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                <span>{capabilityLabel(c)}</span>
              </li>
            ))}
          </ul>
        )}

        {pack.complianceAreas.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coverage</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {pack.complianceAreas.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          </div>
        )}

        {pack.domain && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Local site</p>
            <a
              href={`https://${pack.domain}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {pack.domain}
            </a>
          </div>
        )}

        <Link
          to="/packs/$country"
          params={{ country: pack.code.toLowerCase() }}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          Explore {pack.name}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </CardContent>
    </Card>
  );
}

function ValidationCard({ pack }: { pack: CatalogEntry }) {
  const planned = pack.plannedCapabilities;
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CountryFlag code={pack.code} name={pack.name} className="h-6 w-9" />
            <h3 className="mt-2 font-display font-semibold">{pack.name}</h3>
            <p className="text-xs text-muted-foreground">{pack.region}</p>
          </div>
          <Badge variant="outline" className="shrink-0">{pack.statusLabel}</Badge>
        </div>

        {planned.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Planned capabilities
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {planned.map((c) => (
                <li key={c} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-5 text-sm text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}

function RoadmapCard({ pack }: { pack: CatalogEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
      <CountryFlag code={pack.code} name={pack.name} className="h-3.5 w-5" />
      {pack.name} · {pack.statusLabel}
    </span>
  );
}

/** Roadmap detail used on /packs, where planned capabilities are listed. */
export function RoadmapPackCard({ pack }: { pack: CatalogEntry }) {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CountryFlag code={pack.code} name={pack.name} className="h-6 w-9" />
            <h3 className="mt-2 font-display font-semibold">{pack.name}</h3>
            <p className="text-xs text-muted-foreground">{pack.region}</p>
          </div>
          <Badge variant="outline" className="shrink-0">{pack.statusLabel}</Badge>
        </div>
        {pack.plannedCapabilities.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planned</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {pack.plannedCapabilities.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
