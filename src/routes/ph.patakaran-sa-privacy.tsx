import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/ph/patakaran-sa-privacy")({
  head: () => ({
    meta: [
      { title: "Patakaran sa Privacy — Pilot Validation Program Pilipinas | UBoard Asia" },
      {
        name: "description",
        content:
          "Patakaran sa privacy para sa pilot validation program ng UBoard Asia sa Pilipinas: anong datos ang kinokolekta, layunin, karapatan ng aplikante at haba ng pag-iimbak.",
      },
      {
        property: "og:title",
        content: "Patakaran sa Privacy — Pilot Validation Program Pilipinas | UBoard Asia",
      },
      {
        property: "og:description",
        content: "Patakaran sa privacy para sa pilot validation program ng UBoard Asia sa Pilipinas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fil_PH" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhPrivacyPolicy,
});

function PhPrivacyPolicy() {
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/ph" className="text-sm text-muted-foreground hover:text-foreground">
          ← Bumalik sa pahina ng Pilipinas
        </Link>
        <h1 className="mt-6 mb-4 text-3xl font-semibold tracking-tight">
          Patakaran sa Privacy — Pilot Validation Program
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Bersyon 1.0 — may bisa mula 17 Setyembre 2026
        </p>
        <Card>
          <CardContent className="space-y-6 pt-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">
                1. Datos na kinokolekta namin
              </h2>
              <p>
                Kapag nagpadala kayo ng request para sa pilot access, kinokolekta namin ang buong
                pangalan, email ng kumpanya, pangalan ng entity/kumpanya, tantyang bilang ng
                empleyado, posisyon, at IP address (iniimbak bilang one-way hash). Hindi kami
                humihingi ng SSS, TIN, PhilHealth, Pag-IBIG, bank account o anumang ID document sa
                pamamagitan ng form na ito.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">2. Layunin ng paggamit</h2>
              <p>
                Ginagamit ang datos upang suriin ang pagiging angkop sa pilot program, makipag-ugnayan
                sa aplikante, at tuparin ang mga panloob na obligasyon sa audit. Hindi namin
                ibinebenta o ibinabahagi ang personal na datos sa ikatlong partido para sa marketing.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">
                3. Legal na basehan at pahintulot
              </h2>
              <p>
                Ang pangongolekta ay nakabatay sa inyong malinaw na pahintulot alinsunod sa Data
                Privacy Act of 2012 (RA 10173). Maaari ninyong bawiin ang pahintulot anumang oras sa
                pamamagitan ng pakikipag-ugnayan sa amin; hindi nito naaapektuhan ang pagproseso na
                naunang naisagawa nang naaayon sa batas.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">4. Haba ng pag-iimbak</h2>
              <p>
                Iniimbak ang datos ng pilot nang hanggang 24 na buwan mula sa petsa ng pagpapadala.
                Pagkatapos nito, binubura o ginagawang anonymous ang datos ayon sa aming retention
                policy.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">
                5. Karapatan ng aplikante
              </h2>
              <p>
                May karapatan kayong ma-access, itama, o burahin ang inyong personal na datos, at
                magreklamo sa National Privacy Commission. Maaaring ipadala ang kahilingan sa email
                na nakalista sa pahina ng kontak.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">6. Pagbabago sa patakaran</h2>
              <p>
                Ipapaalam sa pamamagitan ng email ang anumang materyal na pagbabago. Ang bersyon ng
                pahintulot na tinanggap ninyo noong nagpadala kayo ay nananatiling nakatala kasama ng
                inyong datos.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
