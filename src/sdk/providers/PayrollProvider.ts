import type { TaxCalcOutput } from "./TaxProvider";
import type { BenefitsOutput } from "./BenefitsProvider";

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
  buildPayslip(input: PayslipInput): Payslip;
}
