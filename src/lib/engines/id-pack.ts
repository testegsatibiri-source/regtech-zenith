// H2 — Indonesia Country Pack exported via the CountryPack contract.
import { ID_PARAMS } from "../countryPacks";
import { calculateTax, calculateBpjs, calculateThr, terCategory } from "./indonesia";
import type { CountryPack, ComplianceRule } from "./types";

const rules: ComplianceRule[] = [
  {
    code: "ID-UMR-01",
    title: "Base salary ≥ Minimum Wage (UMP)",
    severity: "critical",
    weight: 30,
    evaluate: (e, ctx) => {
      const wages = (ctx.params.minimumWage ?? {}) as Record<string, number>;
      const ump = wages["DKI Jakarta"] ?? wages.Other ?? 0;
      const ok = e.base_salary >= ump;
      return {
        passed: ok,
        message: ok
          ? "Above regional minimum wage."
          : `Base salary below UMP (${ump.toLocaleString("id-ID")}). Risk of Kemenaker sanction.`,
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
        message: ok ? "NPWP on file." : "Missing NPWP — 20% higher PPh 21 withholding applies (DJP).",
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
      return { passed: ok, message: ok ? "Health insurance registered." : "Not enrolled in BPJS Kesehatan (mandatory)." };
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
        message: ok ? "Employment insurance registered." : "Not enrolled in BPJS Ketenagakerjaan (mandatory).",
      };
    },
  },
  {
    code: "ID-OT-06",
    title: "Overtime within Omnibus Law limits",
    severity: "medium",
    weight: 10,
    evaluate: (e, ctx) => {
      const limit = ((ctx.params.overtime as { maxPerWeek: number }) ?? { maxPerWeek: 18 }).maxPerWeek;
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
