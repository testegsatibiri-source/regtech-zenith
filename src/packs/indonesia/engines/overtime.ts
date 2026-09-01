// H23-A — Indonesia overtime calculation (Lembur) per UU Cipta Kerja / Kepmenaker.
//
// Formula: 1/173 × monthlySalary per overtime hour, multiplied by the
// statutory factor for the day type and the number of hours worked.
//
// Work-week patterns:
//   - 5 × 8  = 8 regular hours/day, 40 hours/week
//   - 6 × 7  = 7 regular hours/day, 42 hours/week
//
// Multipliers (conservative reading of Kepmenaker 102/M/VI/2004 as retained
// by the Omnibus Law):
//   Weekday overtime:
//     - first 4 hours: 1.5×
//     - additional hours: 2×
//   Weekly rest day / public holiday:
//     - first regular-hours block (8h for 5×8, 7h for 6×7): 2×
//     - subsequent hours: 3×
//
// This engine does NOT depend on external statutory tables; the only
// variable is the work-week pattern, which is employer-configured.

export type WorkWeekPattern = "5x8" | "6x7";
export type DayType = "weekday" | "rest-day" | "public-holiday";

export interface OvertimeInput {
  monthlySalary: number;
  hours: number;
  dayType: DayType;
  pattern?: WorkWeekPattern;
}

export interface OvertimeResult {
  hourlyRate: number;
  totalPay: number;
  breakdown: { hours: number; multiplier: number; pay: number }[];
}

function regularHours(pattern: WorkWeekPattern): number {
  return pattern === "5x8" ? 8 : 7;
}

export function calculateOvertime({
  monthlySalary,
  hours,
  dayType,
  pattern = "5x8",
}: OvertimeInput): OvertimeResult {
  const hourlyRate = monthlySalary / 173;
  const breakdown: OvertimeResult["breakdown"] = [];
  let remaining = Math.max(0, hours);
  let totalPay = 0;

  if (dayType === "weekday") {
    const firstBlock = Math.min(remaining, 4);
    if (firstBlock > 0) {
      const pay = Math.round(firstBlock * hourlyRate * 1.5);
      breakdown.push({ hours: firstBlock, multiplier: 1.5, pay });
      totalPay += pay;
      remaining -= firstBlock;
    }
    if (remaining > 0) {
      const pay = Math.round(remaining * hourlyRate * 2);
      breakdown.push({ hours: remaining, multiplier: 2, pay });
      totalPay += pay;
    }
  } else {
    // rest-day or public-holiday
    const reg = regularHours(pattern);
    const firstBlock = Math.min(remaining, reg);
    if (firstBlock > 0) {
      const pay = Math.round(firstBlock * hourlyRate * 2);
      breakdown.push({ hours: firstBlock, multiplier: 2, pay });
      totalPay += pay;
      remaining -= firstBlock;
    }
    if (remaining > 0) {
      const pay = Math.round(remaining * hourlyRate * 3);
      breakdown.push({ hours: remaining, multiplier: 3, pay });
      totalPay += pay;
    }
  }

  return { hourlyRate: Math.round(hourlyRate), totalPay, breakdown };
}
