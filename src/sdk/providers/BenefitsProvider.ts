export interface BenefitsInput { salary: number }
export interface BenefitsOutput {
  employee: Record<string, number> & { total: number };
  employer: Record<string, number> & { total: number };
}
export interface BenefitsProvider {
  calculate(input: BenefitsInput): BenefitsOutput;
}
