// H23-A — Optional overtime (lembur) capability.
// Packs that implement statutory overtime multipliers expose this provider.
import type { ProviderContext } from "../context";

export interface OvertimeProviderInput {
  monthlySalary: number;
  hours: number;
  /** Statutory day classification; packs may ignore unsupported values. */
  dayType: "weekday" | "rest-day" | "public-holiday";
  /** Pack-specific modifiers (e.g. Indonesia work-week pattern "5x8" | "6x7"). */
  metadata?: Record<string, unknown>;
}

export interface OvertimeProviderOutput {
  hourlyRate: number;
  totalPay: number;
  breakdown: { hours: number; multiplier: number; pay: number }[];
  legalBasis?: string;
}

export interface OvertimeProvider {
  readonly version: string;
  calculate(input: OvertimeProviderInput, ctx?: ProviderContext): OvertimeProviderOutput;
}
