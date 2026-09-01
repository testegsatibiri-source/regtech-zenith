// BIR Withholding Tax on Compensation — Monthly (TRAIN Law).
import { PH_PARAMS } from "../params";
import type { TaxCalcInput, TaxCalcOutput } from "@/sdk";

export function calculatePhTax(input: TaxCalcInput): TaxCalcOutput {
  const gross = Math.max(0, input.monthlyGross);

  // BIR TRAIN: ₱90,000 annual exemption on 13th month, Christmas bonus,
  // productivity incentives, loyalty awards, gifts and other benefits of a
  // similar nature. For monthly withholding, we treat the caller-supplied
  // nonTaxableBenefits as the amount already exempt, subject to the remaining
  // annual ceiling. This is a conservative approximation until annual YTD data
  // is available via ProviderContext.
  const nonTaxable = Math.max(0, input.nonTaxableBenefits ?? 0);
  const used = Math.max(0, input.cumulativeTaxableBenefits ?? 0);
  const remainingCeiling = Math.max(0, PH_PARAMS.birExemptBenefitsCeiling - used);
  const exemptThisPeriod = Math.min(nonTaxable, remainingCeiling);
  const taxableGross = Math.max(0, gross - exemptThisPeriod);

  // Bracket lookup is floor-based (descending): the published BIR table has
  // 1-peso gaps between `upTo` and the next `floor`, so an `upTo` lookup would
  // drop fractional grosses such as 33,332.50 into the wrong bracket.
  const brackets = PH_PARAMS.birMonthly;
  const bracket = [...brackets].reverse().find((b) => taxableGross >= b.floor) ?? brackets[0]!;
  const excess = Math.max(0, taxableGross - bracket.floor);
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
