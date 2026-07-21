// H5/H6 — Malaysia stub pack. Proves multi-country boot; providers to follow.
import type { CountryPack, HealthReport } from "@/sdk/CountryPack";
import type { CountryManifest } from "@/sdk/manifest";
import type { Capability } from "@/sdk/Capability";

const manifest: CountryManifest = {
  country: "MY",
  name: "Malaysia",
  currency: "MYR",
  version: "0.1.0",
  rulesetVersion: "MY-2024.0",
  engines: [],
  provides: [],
  requires: [],
  events: { emits: [], consumes: [] },
  features: ["stub"],
  supportedLanguages: ["ms", "en"],
  requiresCore: ">=2.0.0",
};

export const malaysiaPack: CountryPack = {
  manifest,
  params: {},
  providers: {},
  supports: (_c: Capability) => false,
  health: (): HealthReport => ({
    status: "warn",
    checks: [{ name: "stub", ok: true, message: "Malaysia is a stub — no providers implemented yet" }],
  }),
};
