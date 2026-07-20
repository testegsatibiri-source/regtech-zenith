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
  calculate(input: TaxCalcInput): TaxCalcOutput;
}
