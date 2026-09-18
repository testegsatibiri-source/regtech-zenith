import { createFileRoute } from "@tanstack/react-router";
import { getPhLandingData } from "@/lib/packs/packs.functions";
import { PhHero } from "@/components/landing-ph/PhHero";
import { PhStatus } from "@/components/landing-ph/PhStatus";
import { PhCoverage } from "@/components/landing-ph/PhCoverage";
import { PhAutomatedChecks } from "@/components/landing-ph/PhAutomatedChecks";
import { PhArchitecture } from "@/components/landing-ph/PhArchitecture";
import { PhPilotForm } from "@/components/landing-ph/PhPilotForm";

export const Route = createFileRoute("/ph/")({
  // SSR per request: the status badge and version strings must reflect the
  // live runtime catalog, never a static prerendered snapshot (ADR-0032).
  loader: async () => getPhLandingData(),
  head: () => ({
    meta: [
      { title: "Payroll Compliance Engine para sa Pilipinas | UBoard Asia" },
      {
        name: "description",
        content:
          "Philippines Country Pack para sa SSS, PhilHealth, Pag-IBIG, BIR withholding, 13th month pay, leaves at separation pay. Live mula sa runtime ang status at bersyon ng ruleset.",
      },
      { property: "og:title", content: "Payroll Compliance Engine para sa Pilipinas | UBoard Asia" },
      {
        property: "og:description",
        content:
          "Philippines Country Pack para sa SSS, PhilHealth, Pag-IBIG, BIR withholding, 13th month pay at separation pay.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fil_PH" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhLanding,
});

function PhLanding() {
  const { pack } = Route.useLoaderData();

  return (
    <>
      <PhHero />
      <PhStatus
        pack={{
          tier: pack?.tier ?? "unavailable",
          version: pack?.version,
          rulesetVersion: pack?.rulesetVersion,
        }}
      />
      <PhCoverage />
      <PhAutomatedChecks />
      <PhArchitecture />
      <PhPilotForm />
    </>
  );
}
