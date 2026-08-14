// PD 851 — 13th Month Pay. Pro-rata by months of service in the calendar year.
// Correct statutory base is total basic + overtime + night differential earned
// in the calendar year, divided by 12. When the caller cannot supply that
// base, the engine falls back to the current monthly salary and flags the
// fallback so the UI and filings know the value is not yet legally final.
import type { ThirteenthInput, ThirteenthOutput } from "@/sdk";

export function calculatePhThirteenth({
  monthlySalary,
  monthsOfService,
  annualGrossEarned,
}: ThirteenthInput): ThirteenthOutput {
  if (monthsOfService < 1) return { eligible: false, amount: 0, prorated: false, base: 0 };
  const months = Math.min(monthsOfService, 12);
  const prorated = months < 12;
  const fallbackToMonthly = annualGrossEarned === undefined;
  const base = fallbackToMonthly ? monthlySalary : annualGrossEarned / 12;
  const amount = Math.round((months / 12) * base);
  return { eligible: true, amount, prorated, fallbackToMonthly, base: Math.round(base) };
}
