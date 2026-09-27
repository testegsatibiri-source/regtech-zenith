import { Card, CardContent } from "@/components/ui/card";
import { GateSummary } from "@/components/assurance/GateSummary";
import { evaluateId } from "@/lib/assurance/registers/id";
import { evaluatePh } from "@/lib/assurance/registers/ph";

/**
 * Each country is evaluated by its own register/gates. There is deliberately no
 * combined "Asia-wide" status: maturity is always jurisdiction-specific.
 */
export function CountryAssuranceCards() {
  const day = new Date().toISOString().slice(0, 10);
  const items = [
    { flag: "🇮🇩", name: "Indonesia", evaluation: evaluateId(day) },
    { flag: "🇵🇭", name: "Philippines", evaluation: evaluatePh(day) },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Card key={item.name} className="border-border/70">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold">
                <span className="mr-2">{item.flag}</span>
                {item.name}
              </h3>
              <span className="font-mono text-xs uppercase text-muted-foreground">
                {item.evaluation.maturity === "COMMERCIAL" ? "COMMERCIAL" : "VALIDATED / PILOT"}
              </span>
            </div>
            <GateSummary evaluation={item.evaluation} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
