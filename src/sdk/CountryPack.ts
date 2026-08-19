// H5/H6 — Country Pack contract (SDK). Composes providers + manifest + health.
import type { CountryManifest } from "./manifest";
import type { Capability } from "./Capability";
import type { TaxProvider } from "./providers/TaxProvider";
import type { BenefitsProvider } from "./providers/BenefitsProvider";
import type { PayrollProvider } from "./providers/PayrollProvider";
import type { ThirteenthProvider } from "./providers/ThirteenthProvider";
import type { CalendarProvider } from "./providers/CalendarProvider";
import type { ContractProvider } from "./providers/ContractProvider";
import type { RuleProvider } from "./providers/RuleProvider";
import type { AuditProvider } from "./providers/AuditProvider";
import type { FilingProvider } from "./providers/FilingProvider";
import type { SeparationProvider } from "./providers/SeparationProvider";

export interface Providers {
  tax?: TaxProvider;
  benefits?: BenefitsProvider;
  payroll?: PayrollProvider;
  thirteenth?: ThirteenthProvider;
  calendar?: CalendarProvider;
  contracts?: ContractProvider;
  rules?: RuleProvider;
  audit?: AuditProvider;
  /** H21 Phase 4 — optional statutory filing exports. */
  filings?: FilingProvider;
  /** H22 Phase A — optional offboarding / final pay (PH first). */
  separation?: SeparationProvider;
}


export interface HealthCheck {
  name: string;
  ok: boolean;
  message?: string;
}
export interface HealthReport {
  status: "ok" | "warn" | "error";
  checks: HealthCheck[];
}

export interface CountryPack {
  manifest: CountryManifest;
  params: Record<string, unknown>;
  providers: Providers;
  supports(capability: Capability): boolean;
  /** H6 — optional runtime self-check. Called on demand by the Runtime. */
  health?(): Promise<HealthReport> | HealthReport;
}
