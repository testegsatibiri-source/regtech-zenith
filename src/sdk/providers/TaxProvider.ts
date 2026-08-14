import type { ProviderContext } from "../context";

export interface TaxCalcInput {
  monthlyGross: number;
  maritalStatus: string;
  hasNpwp?: boolean;
  /** Portion of monthly compensation already known to be exempt under the
   *  ₱90,000 annual benefits ceiling (e.g. 13th month, de minimis). The engine
   *  clamps the exemption to the remaining annual ceiling. Optional. */
  nonTaxableBenefits?: number;
  /** Cumulative taxable benefits already used in the calendar year, used to
   *  enforce the ₱90,000 annual ceiling. Optional; defaults to 0. */
  cumulativeTaxableBenefits?: number;
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
