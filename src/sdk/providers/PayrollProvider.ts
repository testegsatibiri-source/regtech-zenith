import type { TaxCalcOutput } from "./TaxProvider";
import type { BenefitsOutput } from "./BenefitsProvider";
import type { ProviderContext } from "../context";

export interface PayslipInput {
  baseSalary: number;
  allowances?: number;
  maritalStatus: string;
  hasNpwp?: boolean;
}
export interface Payslip {
  gross: number;
  tax: TaxCalcOutput;
  benefits: BenefitsOutput;
  net: number;
  employerCost: number;
}
export interface PayrollProvider {
  readonly version: string;
  buildPayslip(input: PayslipInput, ctx?: ProviderContext): Payslip;
}
