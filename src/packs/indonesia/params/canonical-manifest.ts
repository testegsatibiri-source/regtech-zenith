// H11.1a — Canonical signable bytes for a pack manifest.
// Signing / verification MUST operate on the same subset of fields, so we
// isolate that projection here. The `signature` block is deliberately excluded.
import type { CountryManifest } from "@/sdk/manifest";

export interface CanonicalSignable {
  country: string;
  name: string;
  currency: string;
  version: string;
  rulesetVersion: string;
  interfaceVersion?: string;
}

export function canonicalSignable(m: CountryManifest): CanonicalSignable {
  return {
    country: m.country,
    name: m.name,
    currency: m.currency,
    version: m.version,
    rulesetVersion: m.rulesetVersion,
    interfaceVersion: m.interfaceVersion,
  };
}

export function canonicalManifestBytes(m: CountryManifest): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(canonicalSignable(m)));
}
