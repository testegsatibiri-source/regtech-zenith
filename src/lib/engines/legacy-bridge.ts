// H6 — Bridge between the SDK Runtime and the older `CountryPack` shape
// consumed by `compliance.ts` / `contracts.ts` engines. This lets legacy
// engine helpers keep working while all discovery flows through
// CountryRuntime (no direct pack imports elsewhere in the codebase).
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";
import type { CountryPack, CountryCode } from "./types";
import { calculateTax, calculateBpjs, calculateThr } from "./indonesia";

export function getLegacyPack(code: CountryCode = "ID"): CountryPack {
  const p = CountryRuntime.get(code);
  const rules = p.providers.rules?.rules() ?? [];
  return {
    code: code as CountryCode,
    name: p.manifest.name,
    currency: p.manifest.currency,
    rulesetVersion: p.manifest.rulesetVersion,
    params: p.params,
    // Concrete engines are pack-internal helpers; wiring them here keeps
    // the legacy contract satisfied for callers that haven't migrated.
    taxEngine: (i) => {
      const r = calculateTax(i);
      return { category: r.category, rate: r.rate, tax: r.tax, surcharge: r.npwpSurcharge };
    },
    socialEngine: (i) => {
      const r = calculateBpjs(i.salary);
      return {
        employee: { ...r.employee } as Record<string, number> & { total: number },
        employer: { ...r.employer } as Record<string, number> & { total: number },
      };
    },
    thirteenthEngine: (i) => calculateThr(i),
    complianceRules: rules,
  };
}

export function listLegacyPacks(): CountryPack[] {
  return CountryRuntime.list()
    .filter((r) => r.status === "installed" || r.status === "degraded")
    .map((r) => getLegacyPack(r.pack.manifest.country as CountryCode));
}
