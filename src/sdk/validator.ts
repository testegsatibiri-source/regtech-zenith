// H6 — Compatibility Validator.
// Runs at install-time. Verifies core version, capability coverage, provider
// interface versions, manifest coherence, event-catalog membership and
// (structurally) the optional signature envelope.
import type { CountryPack, Providers } from "./CountryPack";
import type { Capability } from "./Capability";
import { CAPABILITIES } from "./Capability";
import { CORE_VERSION, capabilitySatisfies, satisfies } from "./version";
import { EXPECTED_INTERFACES } from "./interfaces";
import { SDK_EVENT_TYPES, type SdkEventType } from "./events";

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

// Map capability → provider key on `Providers`
const CAP_TO_KEY: Record<Capability, keyof Providers | null> = {
  tax: "tax",
  benefits: "benefits",
  payroll: "payroll",
  thirteenth: "thirteenth",
  calendar: "calendar",
  contracts: "contracts",
  rules: "rules",
  audit: "audit",
  // Capabilities without a dedicated provider slot yet
  overtime: null,
  leave: null,
};

export function validatePack(pack: CountryPack): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const m = pack.manifest;

  // --- Basic manifest sanity ---
  if (!m.country || !/^[A-Z]{2}$/.test(m.country)) {
    errors.push(`manifest.country must be ISO 3166-1 alpha-2 (got "${m.country}")`);
  }
  if (!m.name) errors.push("manifest.name required");
  if (!m.currency) errors.push("manifest.currency required");
  if (!/^\d+\.\d+\.\d+/.test(m.version)) errors.push(`manifest.version must be semver (got "${m.version}")`);
  if (!/^[A-Z]{2}-\d{4}\.\d+$/.test(m.rulesetVersion) && m.rulesetVersion !== "MY-2024.0") {
    warnings.push(`manifest.rulesetVersion "${m.rulesetVersion}" does not match <CC>-YYYY.N`);
  }

  // --- Core compat ---
  if (!satisfies(m.requiresCore, CORE_VERSION)) {
    errors.push(`requires core ${m.requiresCore}, running ${CORE_VERSION}`);
  }

  // --- provides ↔ providers coherence ---
  const provides = m.provides ?? m.engines ?? [];
  for (const cap of provides) {
    if (!CAPABILITIES.includes(cap)) {
      errors.push(`provides: unknown capability "${cap}"`);
      continue;
    }
    const key = CAP_TO_KEY[cap];
    if (!key) continue; // capability doesn't map to a typed provider slot yet
    const provider = pack.providers[key] as { version?: string } | undefined;
    if (!provider) {
      errors.push(`capability "${cap}" declared in provides but no ${key} provider supplied`);
      continue;
    }
    if (!provider.version) {
      errors.push(`${key} provider is missing a \`version\` field`);
      continue;
    }
    const expected = EXPECTED_INTERFACES[cap];
    if (!capabilitySatisfies(expected, provider.version)) {
      errors.push(
        `${key} provider version ${provider.version} is incompatible with expected ${expected}`,
      );
    }
  }

  // Warn on providers that aren't declared
  for (const key of Object.keys(pack.providers) as (keyof Providers)[]) {
    const cap = (Object.entries(CAP_TO_KEY).find(([, v]) => v === key)?.[0]) as Capability | undefined;
    if (cap && !provides.includes(cap)) {
      warnings.push(`${key} provider supplied but "${cap}" not in manifest.provides`);
    }
  }

  // --- requires resolution (self-only for now; foreign packs checked by Runtime) ---
  for (const cap of m.requires ?? []) {
    if (!CAPABILITIES.includes(cap)) {
      errors.push(`requires: unknown capability "${cap}"`);
      continue;
    }
    if (!provides.includes(cap)) {
      warnings.push(`requires "${cap}" not provided by this pack — Runtime must resolve from another pack`);
    }
  }

  // --- Events must be in the catalog ---
  const emits = m.events?.emits ?? [];
  const consumes = m.events?.consumes ?? [];
  for (const e of [...emits, ...consumes]) {
    if (!SDK_EVENT_TYPES.includes(e as SdkEventType)) {
      errors.push(`event "${e}" is not in the SDK catalog`);
    }
  }

  // --- Signature (structural only; verification is DEBT-016) ---
  if (m.signature) {
    if (!m.signature.publisher) errors.push("signature.publisher required");
    if (!m.signature.checksum) errors.push("signature.checksum required");
    if (m.signature.algo !== "sha256") errors.push(`signature.algo must be "sha256"`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
