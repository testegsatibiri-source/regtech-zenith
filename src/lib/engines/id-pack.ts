// H2 — Indonesia Country Pack exported via the CountryPack contract.
import { ID_PARAMS } from "../countryPacks";
import { calculateTax, calculateBpjs, calculateThr, terCategory } from "./indonesia";
import type { CountryPack, ComplianceRule } from "./types";

import { UMP_2026, UMP_FALLBACK } from "@/packs/indonesia/params/ump-2026";
import { resolveWageFloor } from "@/packs/indonesia/params/umk-2026";

const UMP_BY_PROVINCE = new Map<string, number>(
  [...UMP_2026, UMP_FALLBACK].map((e) => [e.province, e.amount]),
);
function resolveUmp(province: string | undefined | null): {
  amount: number;
  province: string;
  stale: boolean;
  sourceStatus: import("@/packs/indonesia/params/ump-2026").UmpSourceStatus;
} {
  if (province && UMP_BY_PROVINCE.has(province)) {
    const entry = [...UMP_2026, UMP_FALLBACK].find((e) => e.province === province)!;
    return {
      amount: entry.amount,
      province: entry.province,
      stale: !!entry.stale,
      sourceStatus: entry.sourceStatus ?? "stale",
    };
  }
  return {
    amount: UMP_FALLBACK.amount,
    province: "Other (fallback)",
    stale: false,
    sourceStatus: UMP_FALLBACK.sourceStatus ?? "stale",
  };
}

const rules: ComplianceRule[] = [
  {
    code: "ID-UMR-01",
    title: "Base salary ≥ Minimum Wage (UMP/UMK)",
    severity: "critical",
    weight: 30,
    evaluate: (e) => {
      const meta = (e.country_metadata ?? {}) as Record<string, unknown>;
      const province = (meta.province as string | undefined) ?? null;
      const region =
        (meta.city as string | undefined) ??
        (meta.regency as string | undefined) ??
        (meta.kabupaten as string | undefined) ??
        null;
      const { amount: ump, province: resolved, stale, sourceStatus } = resolveUmp(province);
      const floor = resolveWageFloor({ province: resolved, amount: ump, sourceStatus }, region);
      const ok = e.base_salary >= floor.amount;
      if (!floor.conclusive) {
        return {
          passed: false,
          conclusive: false,
          message: `Binding floor for ${floor.jurisdiction} (${floor.amount.toLocaleString("id-ID")}) is ${floor.sourceStatus}${stale ? "/stale" : ""}. Non-conclusive until the official SK Gubernur (${floor.layer.toUpperCase()}) is reconciled. Chain: ${floor.trail.join(" → ")}`,
        };
      }
      return {
        passed: ok,
        conclusive: true,
        message: ok
          ? `Above the ${floor.layer.toUpperCase()} floor for ${floor.jurisdiction} (${floor.amount.toLocaleString("id-ID")}).`
          : `Base salary below the ${floor.layer.toUpperCase()} floor for ${floor.jurisdiction} (${floor.amount.toLocaleString("id-ID")}). Risk of Kemenaker sanction.`,
      };
    },
  },

  {
    code: "ID-TAX-02",
    title: "NPWP (tax ID) registered",
    severity: "high",
    weight: 18,
    evaluate: (e) => {
      const ok = Boolean((e.country_metadata ?? {}).npwp);
      return {
        passed: ok,
        message: ok
          ? "NPWP on file."
          : "Missing NPWP — 20% higher PPh 21 withholding applies (DJP).",
      };
    },
  },
  {
    code: "ID-ID-03",
    title: "NIK (national ID) recorded",
    severity: "medium",
    weight: 10,
    evaluate: (e) => {
      const ok = Boolean((e.country_metadata ?? {}).nik);
      return {
        passed: ok,
        message: ok ? "NIK on file." : "Missing NIK — required for BPJS & Dukcapil validation.",
      };
    },
  },
  {
    code: "ID-BPJS-04",
    title: "BPJS Kesehatan enrolled",
    severity: "high",
    weight: 18,
    evaluate: (e) => {
      const ok = Boolean((e.country_metadata ?? {}).bpjs_kesehatan);
      return {
        passed: ok,
        message: ok
          ? "Health insurance registered."
          : "Not enrolled in BPJS Kesehatan (mandatory).",
      };
    },
  },
  {
    code: "ID-BPJS-05",
    title: "BPJS Ketenagakerjaan enrolled",
    severity: "high",
    weight: 18,
    evaluate: (e) => {
      const ok = Boolean((e.country_metadata ?? {}).bpjs_ketenagakerjaan);
      return {
        passed: ok,
        message: ok
          ? "Employment insurance registered."
          : "Not enrolled in BPJS Ketenagakerjaan (mandatory).",
      };
    },
  },
  {
    code: "ID-OT-06",
    title: "Overtime within Omnibus Law limits",
    severity: "medium",
    weight: 10,
    evaluate: (e, ctx) => {
      const limit = ((ctx.params.overtime as { maxPerWeek: number }) ?? { maxPerWeek: 18 })
        .maxPerWeek;
      const h = Number((e.country_metadata ?? {}).weekly_overtime_hours ?? 0);
      const ok = h <= limit;
      return {
        passed: ok,
        message: ok
          ? "Overtime within legal limit."
          : `Weekly overtime ${h}h exceeds ${limit}h limit — labour dispute risk.`,
      };
    },
  },
];

export const indonesiaPack: CountryPack = {
  code: "ID",
  name: "Indonesia",
  currency: "IDR",
  rulesetVersion: `ID-${ID_PARAMS.version}`,
  params: ID_PARAMS as unknown as Record<string, unknown>,
  taxEngine: (input) => {
    const r = calculateTax(input);
    return { category: r.category, rate: r.rate, tax: r.tax, surcharge: r.npwpSurcharge };
  },
  socialEngine: (input) => {
    const r = calculateBpjs(input.salary);
    return {
      employee: { ...r.employee } as Record<string, number> & { total: number },
      employer: { ...r.employer } as Record<string, number> & { total: number },
    };
  },
  thirteenthEngine: (input) => calculateThr(input),
  complianceRules: rules,
};

export function terCategoryFor(marital: string) {
  return terCategory(marital);
}
