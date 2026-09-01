import type { ProviderContext } from "../context";

export interface BenefitsInput {
  salary: number;
  /** Pack-specific modifiers such as risk level, optional programs, etc. */
  metadata?: Record<string, unknown>;
}
export interface BenefitsOutput {
  employee: Record<string, number> & { total: number };
  employer: Record<string, number> & { total: number };
  /** Optional provenance/status of the parameters used (epistemic honesty). */
  sourceStatus?: Record<string, "official" | "media-report" | "stale">;
  /** Optional extra program results (e.g. Indonesia JKP). */
  jkp?: { government: number; jkkRecomposition: number; jkmRecomposition: number; total: number };
}
export interface BenefitsProvider {
  readonly version: string;
  calculate(input: BenefitsInput, ctx?: ProviderContext): BenefitsOutput;
}
