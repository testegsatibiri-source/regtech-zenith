import type { ProviderContext } from "../context";

/**
 * H21 Phase 4 — statutory filing exports.
 *
 * Southeast-Asian revenue and social-security agencies (BIR, SSS, PhilHealth,
 * Pag-IBIG) publish no employer-facing REST API: submission happens through web
 * portals that accept fixed-layout files. The SDK therefore models *artifact
 * generation*, not transmission. Transmission is recorded by the Core as an
 * out-of-band receipt (DEBT-023).
 *
 * Optional capability — packs without it keep interface v1 conformance.
 */

export interface FilingForm {
  code: string;
  title: string;
  agency: string;
  /** File layout produced by `generate()`. */
  format: "csv" | "dat" | "txt";
  cadence: "monthly" | "quarterly" | "annual";
  legalBasis: string;
  /** Whether the form covers one month or the whole year. */
  scope: "period" | "annual";
  description: string;
}

export interface FilingEmployeeRecord {
  employeeId?: string;
  fullName: string;
  /** Statutory identifiers as registered (raw values; the pack normalizes). */
  identifiers: Record<string, unknown>;
  gross: number;
  taxWithheld: number;
  /** Employee-side statutory contributions, keyed by scheme. */
  employeeContributions: Record<string, number>;
  /** Employer-side statutory contributions, keyed by scheme. */
  employerContributions: Record<string, number>;
  net: number;
  thirteenthMonth?: number;
}

export interface FilingEmployer {
  legalName: string;
  statutoryMetadata?: Record<string, unknown> | null;
  address?: string | null;
}

export interface FilingRequest {
  formCode: string;
  year: number;
  /** Required for `scope: "period"` forms. */
  month?: number;
  employer: FilingEmployer;
  employees: FilingEmployeeRecord[];
}

export interface FilingArtifact {
  formCode: string;
  title: string;
  filename: string;
  format: FilingForm["format"];
  /** Full file body, exactly as it must be uploaded. */
  content: string;
  rowCount: number;
  totals: Record<string, number>;
  /** Blocking or advisory notes (missing identifiers, zero rows, …). */
  warnings: string[];
  /** Ruleset the numbers were produced under — stamped on the stored filing. */
  rulesetVersion: string;
}

export interface FilingProvider {
  readonly version: string;
  forms(ctx?: ProviderContext): FilingForm[];
  generate(request: FilingRequest, ctx?: ProviderContext): FilingArtifact;
}
