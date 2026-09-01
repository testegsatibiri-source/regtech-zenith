// Reference fixtures for Philippines (PH-2024.1). BIR TRAIN monthly + SSS/PhilHealth/Pag-IBIG.
import type { TaxCalcInput, BenefitsInput } from "@/sdk";

export interface PhTaxCase {
  name: string;
  input: TaxCalcInput;
  expected: { rate?: number; taxMin?: number; taxMax?: number; category?: string };
}

export const PH_TAX_CASES: PhTaxCase[] = [
  {
    name: "Below exemption (₱20,833) → 0 tax",
    input: { monthlyGross: 20_000, maritalStatus: "single", hasNpwp: true },
    expected: { taxMin: 0, taxMax: 0 },
  },
  {
    name: "₱30,000 → 15% of excess over 20,833",
    input: { monthlyGross: 30_000, maritalStatus: "single", hasNpwp: true },
    expected: { taxMin: 1_300, taxMax: 1_400 },
  },
  {
    name: "₱50,000 → 20% bracket + fixed 1,875",
    input: { monthlyGross: 50_000, maritalStatus: "single", hasNpwp: true },
    expected: { taxMin: 5_100, taxMax: 5_300 },
  },
  {
    name: "₱100,000 → 25% bracket",
    input: { monthlyGross: 100_000, maritalStatus: "single", hasNpwp: true },
    expected: { taxMin: 16_800, taxMax: 17_100 },
  },
  {
    name: "₱1,000,000 → top 35% bracket",
    input: { monthlyGross: 1_000_000, maritalStatus: "single", hasNpwp: true },
    expected: { taxMin: 300_000, taxMax: 310_000 },
  },
];

export interface PhBenefitsCase {
  name: string;
  input: BenefitsInput;
  expected: { employeeTotalGt?: number; employerTotalGt?: number; employeeTotalLt?: number };
}

export const PH_BENEFITS_CASES: PhBenefitsCase[] = [
  {
    name: "Zero salary",
    input: { salary: 0 },
    expected: { employeeTotalGt: -1, employerTotalGt: -1 },
  },
  {
    name: "₱15,000 mid-range",
    input: { salary: 15_000 },
    expected: { employeeTotalGt: 800, employerTotalGt: 1_500 },
  },
  {
    name: "₱30,000 — SSS at MSC cap",
    input: { salary: 30_000 },
    expected: { employeeTotalGt: 2_000, employerTotalGt: 3_500 },
  },
  {
    name: "₱200,000 — PhilHealth clamped at ₱100k cap",
    input: { salary: 200_000 },
    expected: { employeeTotalGt: 2_800, employerTotalGt: 3_700 },
  },
];
