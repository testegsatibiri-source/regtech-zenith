import { Badge } from "@/components/ui/badge";
import type { AssuranceEvaluation } from "@/lib/assurance/types";

const variant = { PASS: "default", CONDITIONAL: "secondary", FAIL: "destructive" } as const;

export function GateSummary({ evaluation }: { evaluation: AssuranceEvaluation }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{evaluation.statement}</p>
      <div className="flex flex-wrap gap-2">
        {evaluation.gates.map((g) => (
          <Badge key={g.gate} variant={variant[g.status]} title={g.reasons.join("\n")}>
            {g.gate} {g.name} · {g.status}
          </Badge>
        ))}
      </div>
    </div>
  );
}
