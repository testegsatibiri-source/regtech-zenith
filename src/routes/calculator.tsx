import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { PayrollCalculator } from "@/components/PayrollCalculator";
import { ID_PARAMS } from "@/lib/countryPacks";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Indonesia Payroll Calculator — PPh 21, BPJS, THR | UBoard Asia" },
      { name: "description", content: "Free Indonesia payroll calculator: PPh 21 (TER), BPJS and THR with 2024 parameters. Instant gross-to-net breakdown." },
      { property: "og:title", content: "Indonesia Payroll Calculator — UBoard Asia" },
      { property: "og:description", content: "PPh 21 (TER), BPJS and THR — instant gross-to-net breakdown." },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Indonesia Payroll Calculator</h1>
          <p className="mt-2 text-muted-foreground">
            Country Pack <span className="font-medium text-foreground">Indonesia · v{ID_PARAMS.version}</span> · effective {ID_PARAMS.effectiveFrom}
          </p>
        </div>
        <PayrollCalculator />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Estimates for guidance only. TER Category A/B/C, BPJS caps and rates are configurable Country Pack parameters.
        </p>
      </div>
    </div>
  );
}
