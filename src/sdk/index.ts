// H5/H6 — Compliance SDK public surface.
export type { Capability } from "./Capability";
export { CAPABILITIES } from "./Capability";
export type { CountryManifest, PackSignature, PackDependency } from "./manifest";
export type { CountryPack, Providers, HealthCheck, HealthReport } from "./CountryPack";
export { CountryRuntime } from "./runtime";
export type { InstalledPack, PackStatus } from "./runtime";
export { CORE_VERSION, satisfies, capabilitySatisfies } from "./version";
export { EXPECTED_INTERFACES } from "./interfaces";
export { validatePack, type ValidationReport } from "./validator";
export type { ProviderContext } from "./context";
export {
  PackNotFound,
  IncompatibleCoreVersion,
  CapabilityUnsupported,
  PackValidationFailed,
} from "./errors";
export type { SdkEvent, SdkEventType } from "./events";
export { SDK_EVENT_TYPES } from "./events";
export type { TaxProvider, TaxCalcInput, TaxCalcOutput } from "./providers/TaxProvider";
export type { BenefitsProvider, BenefitsInput, BenefitsOutput } from "./providers/BenefitsProvider";
export type { PayrollProvider, PayslipInput, Payslip } from "./providers/PayrollProvider";
export type { ThirteenthProvider, ThirteenthInput, ThirteenthOutput } from "./providers/ThirteenthProvider";
export type { CalendarProvider, ObligationTemplate } from "./providers/CalendarProvider";
export type { ContractProvider, ContractLike, ContractFinding } from "./providers/ContractProvider";
export type { RuleProvider } from "./providers/RuleProvider";
export type { AuditProvider, AuditHeuristic, AuditContext } from "./providers/AuditProvider";
