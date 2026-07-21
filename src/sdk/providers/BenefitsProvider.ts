import type { ProviderContext } from "../context";

export interface BenefitsInput { salary: number }
export interface BenefitsOutput {
  employee: Record<string, number> & { total: number };
  employer: Record<string, number> & { total: number };
}
export interface BenefitsProvider {
  readonly version: string;
  calculate(input: BenefitsInput, ctx?: ProviderContext): BenefitsOutput;
}
