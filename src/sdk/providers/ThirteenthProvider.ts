import type { ProviderContext } from "../context";

export interface ThirteenthInput {
  monthlySalary: number;
  monthsOfService: number;
}
export interface ThirteenthOutput {
  eligible: boolean;
  amount: number;
  prorated: boolean;
}
export interface ThirteenthProvider {
  readonly version: string;
  calculate(input: ThirteenthInput, ctx?: ProviderContext): ThirteenthOutput;
}
