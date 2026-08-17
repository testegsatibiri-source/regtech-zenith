import type { ProviderContext } from "../context";

/**
 * H21 Phase 3 — some jurisdictions stagger statutory deadlines per employer
 * (PH: SSS ER number digit, PhilHealth PEN digit, Pag-IBIG name letter).
 * The subject is optional and additive: packs that ignore it keep working.
 */
export interface CalendarSubject {
  /** Employer statutory registry (companies.statutory_metadata). */
  statutoryMetadata?: Record<string, unknown> | null;
  /** Registered legal/company name. */
  legalName?: string | null;
}

export interface ObligationOccurrence {
  period_start: string;
  period_end: string;
  due_date: string;
  /** Statutory date before any weekend/holiday roll-forward. */
  statutory_date?: string;
  /** `needs_review` when the deadline could not be resolved from registry data. */
  resolution?: "resolved" | "needs_review";
  /** Legal basis of the applied stagger/roll rule. */
  rule?: string;
  /** Why the occurrence needs review. */
  reason?: string;
}

export interface ObligationTemplate {
  code: string;
  title: string;
  category: string;
  cadence: "monthly" | "quarterly" | "annual" | "one_off";
  severity: "critical" | "high" | "medium";
  legalBasis?: string;
  /** Given a year (and optionally the employer subject), produce all due dates. */
  occurrences(year: number, subject?: CalendarSubject): ObligationOccurrence[];
}

export interface CalendarProvider {
  readonly version: string;
  templates(ctx?: ProviderContext): ObligationTemplate[];
}
