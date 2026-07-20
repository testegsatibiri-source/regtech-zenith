// H5 — Malaysia stub pack. Proves multi-country boot; no providers yet.
import type { CountryPack } from "@/sdk/CountryPack";
import type { CountryManifest } from "@/sdk/manifest";
import type { Capability } from "@/sdk/Capability";

const manifest: CountryManifest = {
  country: "MY",
  name: "Malaysia",
  currency: "MYR",
  version: "0.1.0",
  rulesetVersion: "MY-2024.0",
  engines: [],
  supportedLanguages: ["ms", "en"],
  requiresCore: ">=2.0.0",
};

export const malaysiaPack: CountryPack = {
  manifest,
  params: {},
  providers: {},
  supports: (_c: Capability) => false,
};
