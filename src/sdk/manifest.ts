// H5/H6 — Country Pack manifest (expanded).
import type { Capability } from "./Capability";
import type { SdkEventType } from "./events";

export interface PackSignature {
  publisher: string;
  checksum: string;
  algo: "sha256";
}

export interface PackDependency {
  pack: string;      // ISO 3166-1 alpha-2 of another country pack
  range: string;     // semver range against that pack's `version`
}

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

  /**
   * @deprecated use `provides`. Kept as alias for backward compatibility.
   * Populated automatically from `provides` if omitted.
   */
  engines: Capability[];

  /** Capabilities the pack exposes to the platform. */
  provides: Capability[];
  /** Capabilities this pack requires (from itself or from other installed packs). */
  requires?: Capability[];

  /** Events this pack emits / consumes on the SDK bus. Validated against the SdkEvent catalog. */
  events?: { emits?: SdkEventType[]; consumes?: SdkEventType[] };

  /** Declarative permission scopes the pack needs. Runtime enforcement is planned (DEBT-015). */
  permissions?: string[];

  /** Free-form feature flags a pack advertises (e.g. "expat-visa"). */
  features?: string[];

  /** Cross-pack dependencies. */
  dependencies?: PackDependency[];

  /** Optional publisher signature (reserved; verification is planned — DEBT-016). */
  signature?: PackSignature;

  /** Placeholder for the Sprint H7 lifecycle. Names of exported hooks in the pack module. */
  lifecycleHooks?: { onInstall?: string; onEnable?: string; onDisable?: string };

  /** BCP-47 language codes offered by the pack UI copy. */
  supportedLanguages: string[];
  /** Semver range the pack requires from Core. */
  requiresCore: string;

  /**
   * H11-Freeze — Country Pack Interface contract this pack was built against.
   * Optional today; enforced by the validator when present. Once
   * PACK_INTERFACE_ENFORCE is on, packs without a compatible value are rejected.
   */
  interfaceVersion?: string;
}
