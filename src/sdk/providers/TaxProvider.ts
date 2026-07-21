import type { ProviderContext } from "../context";

export interface TaxCalcInput {
  monthlyGross: number;
  maritalStatus: string;
  hasNpwp?: boolean;
}
export interface TaxCalcOutput {
  category?: string;
  rate: number;
  tax: number;
  surcharge: number;
}
export interface TaxProvider {
  /** Semver of the provider implementation. Checked against EXPECTED_INTERFACES.tax. */
  readonly version: string;
  calculate(input: TaxCalcInput, ctx?: ProviderContext): TaxCalcOutput;
}
