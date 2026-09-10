import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LocaleScope } from "@/lib/i18n";
import { getIdLandingData } from "@/lib/packs/packs.functions";
import { IdNavbar } from "@/components/landing-id/IdNavbar";
import { IdHero } from "@/components/landing-id/IdHero";
import { IdStatus } from "@/components/landing-id/IdStatus";
import { IdCoverage } from "@/components/landing-id/IdCoverage";
import { IdAutomatedChecks } from "@/components/landing-id/IdAutomatedChecks";
import { IdArchitecture } from "@/components/landing-id/IdArchitecture";
import { IdPilotForm } from "@/components/landing-id/IdPilotForm";
import { IdFooter } from "@/components/landing-id/IdFooter";

export const Route = createFileRoute("/id")({
  // SSR per request: the status badge and version strings must reflect the
  // live runtime catalog, never a static prerendered snapshot (ADR-0032).
  loader: async () => getIdLandingData(),
  head: () => ({
    meta: [
      { title: "Mesin Kepatuhan Penggajian Indonesia | UBoard Asia" },
      {
        name: "description",
        content:
          "Country Pack Indonesia untuk PPh 21 TER, BPJS, pesangon PP 35/2021, THR, lembur, dan perlindungan data pribadi. Status validasi dan versi ruleset diambil langsung dari runtime.",
      },
      { property: "og:title", content: "Mesin Kepatuhan Penggajian Indonesia | UBoard Asia" },
      {
        property: "og:description",
        content:
          "Country Pack Indonesia untuk PPh 21 TER, BPJS, pesangon PP 35/2021, THR, lembur, dan perlindungan data pribadi.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "id_ID" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdLanding,
});

function IdLanding() {
  const { pack } = Route.useLoaderData();

  useEffect(() => {
    document.documentElement.lang = "id-ID";
    return () => {
      document.documentElement.lang = "en";
    };
  }, []);

  return (
    <LocaleScope lang="id">
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <IdNavbar />
        <main className="flex-1">
          <IdHero />
          <IdStatus
            pack={{
              tier: pack.tier,
              version: pack.version,
              rulesetVersion: pack.rulesetVersion,
            }}
          />
          <IdCoverage />
          <IdAutomatedChecks />
          <IdArchitecture />
          <IdPilotForm />
        </main>
        <IdFooter />
      </div>
    </LocaleScope>
  );
}
