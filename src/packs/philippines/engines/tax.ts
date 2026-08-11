// BIR Withholding Tax on Compensation — Monthly (TRAIN Law).
import { PH_PARAMS } from "../params";
import type { TaxCalcInput, TaxCalcOutput } from "@/sdk";

export function calculatePhTax(input: TaxCalcInput): TaxCalcOutput {
  const gross = Math.max(0, input.monthlyGross);
  // Bracket lookup is floor-based (descending): the published BIR table has
  // 1-peso gaps between `upTo` and the next `floor`, so an `upTo` lookup would
  // drop fractional grosses such as 33,332.50 into the wrong bracket.
  const brackets = PH_PARAMS.birMonthly;
  const bracket =
    [...brackets].reverse().find((b) => gross >= b.floor) ?? brackets[0]!;
  const excess = Math.max(0, gross - bracket.floor);
  const tax = Math.round(bracket.fixed + excess * bracket.rate);

  const effectiveRate = gross > 0 ? tax / gross : 0;
  return {
    // No marital-status categories in PH withholding (TRAIN removed personal
    // exemptions). Category surfaced for consistency.
    category: "monthly",
    rate: Number(effectiveRate.toFixed(4)),
    tax,
    surcharge: 0,
  };
}
