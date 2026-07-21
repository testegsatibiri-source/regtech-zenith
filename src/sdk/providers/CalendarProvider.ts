import type { ProviderContext } from "../context";

export interface ObligationTemplate {
  code: string;
  title: string;
  category: string;
  cadence: "monthly" | "quarterly" | "annual" | "one_off";
  severity: "critical" | "high" | "medium";
  legalBasis?: string;
  /** Given a year, produce all due dates for this template. */
  occurrences(year: number): { period_start: string; period_end: string; due_date: string }[];
}

export interface CalendarProvider {
  readonly version: string;
  templates(ctx?: ProviderContext): ObligationTemplate[];
}
