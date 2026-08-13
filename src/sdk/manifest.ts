// H5/H6 — Country Pack manifest (expanded).
import type { Capability } from "./Capability";
import type { SdkEventType } from "./events";

/**
 * H10 legacy shape — kept for structural validation of the checksum field.
 * H11.1a introduces `SignatureBlock` with `keyId`/`algorithm`/`signature`.
 */
export interface PackSignature {
  publisher: string;
  checksum: string;
  algo: "sha256";
}

/** H11.1a — Rotation-friendly signature envelope stored on the manifest. */
export interface SignatureEnvelope {
  keyId: string;
  algorithm: "Ed25519";
  signature: string;   // base64
  publisher?: string;  // metadata only; lookup is by keyId
  ts?: string;
}
export interface SignatureBlock {
  author: SignatureEnvelope;
  countersign?: SignatureEnvelope;
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

  /** @deprecated — use `signatureBlock`. Structural checks still run when present. */
  signature?: PackSignature;

  /** H11.1a — rotation-friendly signature envelope with keyId. */
  signatureBlock?: SignatureBlock;

  /** Placeholder for the Sprint H7 lifecycle. Names of exported hooks in the pack module. */
  lifecycleHooks?: { onInstall?: string; onEnable?: string; onDisable?: string };

  /** BCP-47 language codes offered by the pack UI copy. */
  supportedLanguages: string[];
  /** Semver range the pack requires from Core. */
  requiresCore: string;

  /**
   * H20 — Commercial readiness gate. Declares that the pack's calculation engines
   * are backed by real statutory tables, not simplified models. Optional in the
   * type for retro-compatibility; mandatory for classification as Production.
   * Signed as part of the canonical manifest bytes.
   */
  commercialReady?: boolean;

  /**
   * H11-Freeze — Country Pack Interface contract this pack was built against.
   * Optional today; enforced by the validator when present. Once
   * PACK_INTERFACE_ENFORCE is on, packs without a compatible value are rejected.
   */
  interfaceVersion?: string;

}
