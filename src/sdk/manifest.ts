// H5 — Country Pack manifest.
import type { Capability } from "./Capability";

export interface CountryManifest {
  /** ISO 3166-1 alpha-2 code. */
  country: string;
  /** Human name. */
  name: string;
  /** Local currency code. */
  currency: string;
  /** Pack semver, independent from core. */
  version: string;
  /** Ruleset revision — bumped when legal params change without SDK bump. */
  rulesetVersion: string;
  /** Capabilities this pack implements. */
  engines: Capability[];
  /** BCP-47 language codes offered by the pack UI copy. */
  supportedLanguages: string[];
  /** Semver range the pack requires from Core. */
  requiresCore: string;
}
