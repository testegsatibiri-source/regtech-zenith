import type { ProviderContext } from "../context";

export interface ThirteenthInput {
  monthlySalary: number;
  monthsOfService: number;
  /** Statutory base under PD 851: total basic + overtime + night differential
   *  earned in the calendar year. When absent, the engine may fall back to
   *  current monthlySalary and report the fallback in the output. */
  annualGrossEarned?: number;
}
export interface ThirteenthOutput {
  eligible: boolean;
  amount: number;
  prorated: boolean;
  /** True when the statutory base (annualGrossEarned) was unavailable and the
   *  engine fell back to current monthlySalary. */
  fallbackToMonthly?: boolean;
  /** Statutory annual base used, if available. */
  base?: number;
}

export interface ThirteenthProvider {
  readonly version: string;
  calculate(input: ThirteenthInput, ctx?: ProviderContext): ThirteenthOutput;
}
