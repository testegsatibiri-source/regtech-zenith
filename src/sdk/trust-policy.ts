// H10-Sig — Trust Policy. Configurable per environment: how many valid
// signatures are required for a pack to be installable, which capabilities
// they must carry, and whether Experimental packs are allowed.

export type SigningCapability = "pack.sign" | "pack.countersign";

export interface TrustPolicy {
  environment: "preview" | "staging" | "production";
  requiredSignatures: number;
  requiredCapabilities: SigningCapability[];
  distinctSigners: boolean;
  allowExperimental: boolean;
}

export const TRUST_POLICIES: Record<TrustPolicy["environment"], TrustPolicy> = {
  preview: {
    environment: "preview",
    requiredSignatures: 1,
    requiredCapabilities: ["pack.sign"],
    distinctSigners: false,
    allowExperimental: true,
  },
  staging: {
    environment: "staging",
    requiredSignatures: 1,
    requiredCapabilities: ["pack.sign"],
    distinctSigners: false,
    allowExperimental: false,
  },
  production: {
    environment: "production",
    requiredSignatures: 2,
    requiredCapabilities: ["pack.sign", "pack.countersign"],
    distinctSigners: true,
    allowExperimental: false,
  },
};

export function currentTrustPolicy(): TrustPolicy {
  const env = (typeof process !== "undefined" && process.env?.LOVABLE_ENV) || "preview";
  return TRUST_POLICIES[env as TrustPolicy["environment"]] ?? TRUST_POLICIES.preview;
}
