// PD 851 — 13th Month Pay. Pro-rata by months of service in the calendar year.
import type { ThirteenthInput, ThirteenthOutput } from "@/sdk";

export function calculatePhThirteenth({ monthlySalary, monthsOfService }: ThirteenthInput): ThirteenthOutput {
  if (monthsOfService < 1) return { eligible: false, amount: 0, prorated: false };
  const months = Math.min(monthsOfService, 12);
  const prorated = months < 12;
  const amount = Math.round((months / 12) * monthlySalary);
  return { eligible: true, amount, prorated };
}
