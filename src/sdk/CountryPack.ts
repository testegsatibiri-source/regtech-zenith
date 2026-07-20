// H5 — Country Pack contract (SDK). Composes providers + manifest.
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

export interface Providers {
  tax?: TaxProvider;
  benefits?: BenefitsProvider;
  payroll?: PayrollProvider;
  thirteenth?: ThirteenthProvider;
  calendar?: CalendarProvider;
  contracts?: ContractProvider;
  rules?: RuleProvider;
  audit?: AuditProvider;
}

export interface CountryPack {
  manifest: CountryManifest;
  params: Record<string, unknown>;
  providers: Providers;
  supports(capability: Capability): boolean;
}
