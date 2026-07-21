// H6 — Reference fixtures for Indonesia. Snapshot values expected from a
// conformant Indonesia pack. Values match ID_PARAMS 2024.1 / PP 58/2023.
import type { TaxCalcInput, BenefitsInput } from "@/sdk";

export interface TaxCase {
  name: string;
  input: TaxCalcInput;
  expected: { rate?: number; taxMin?: number; taxMax?: number; surcharge?: number; category?: string };
}

export const ID_TAX_CASES: TaxCase[] = [
  {
    name: "TK/0 below zero-threshold → 0%",
    input: { monthlyGross: 5_000_000, maritalStatus: "TK/0", hasNpwp: true },
    expected: { rate: 0, taxMin: 0, taxMax: 0, category: "A" },
  },
  {
    name: "TK/0 mid-bracket 10M → non-zero",
    input: { monthlyGross: 10_000_000, maritalStatus: "TK/0", hasNpwp: true },
    expected: { rate: 0.02, category: "A" },
  },
  {
    name: "K/2 category B",
    input: { monthlyGross: 8_000_000, maritalStatus: "K/2", hasNpwp: true },
    expected: { category: "B" },
  },
  {
    name: "K/3 category C",
    input: { monthlyGross: 8_000_000, maritalStatus: "K/3", hasNpwp: true },
    expected: { category: "C" },
  },
  {
    name: "No NPWP triggers 20% surcharge",
    input: { monthlyGross: 15_000_000, maritalStatus: "TK/0", hasNpwp: false },
    expected: { surcharge: undefined /* asserted >0 in suite */ },
  },
  {
    name: "Very high salary hits top bracket",
    input: { monthlyGross: 2_000_000_000, maritalStatus: "TK/0", hasNpwp: true },
    expected: { rate: 0.34 },
  },
];

export interface BenefitsCase {
  name: string;
  input: BenefitsInput;
  expected: { employeeTotalGt?: number; employerTotalGt?: number };
}

export const ID_BENEFITS_CASES: BenefitsCase[] = [
  { name: "Zero salary", input: { salary: 0 }, expected: { employeeTotalGt: -1, employerTotalGt: -1 } },
  { name: "Below caps", input: { salary: 5_000_000 }, expected: { employeeTotalGt: 100_000, employerTotalGt: 400_000 } },
  { name: "Above JP cap", input: { salary: 20_000_000 }, expected: { employeeTotalGt: 500_000, employerTotalGt: 900_000 } },
  { name: "Very high", input: { salary: 100_000_000 }, expected: { employeeTotalGt: 2_000_000, employerTotalGt: 4_000_000 } },
];
