import { describe, expect, it } from "vitest";
import { CompatibilityService } from "@/sdk/compatibility";
import type { CountryPack } from "@/sdk/CountryPack";
import type { TrustPolicy } from "@/sdk/trust-policy";

const pack: CountryPack = {
  manifest: {
    country: "XX",
    name: "Test Pack",
    currency: "USD",
    version: "1.0.0",
    rulesetVersion: "XX-2024.0",
    engines: [],
    provides: [],
    supportedLanguages: ["en"],
    requiresCore: ">=2.0.0",
  },
  params: {},
  providers: {},
  supports: () => false,
};

const staging: TrustPolicy = {
  environment: "staging",
  requiredSignatures: 1,
  requiredCapabilities: ["pack.sign"],
  distinctSigners: false,
  allowExperimental: false,
};

const signature = {
  signer: "publisher-a",
  keyId: "key-a",
  publicKey: "",
  algo: "ed25519" as const,
  signature: "signature",
  capability: "pack.sign" as const,
  ts: "2026-01-01T00:00:00Z",
};

describe("CompatibilityService verification availability", () => {
  it("fails closed in staging when the trust store or canonical bytes are missing", async () => {
    const report = await new CompatibilityService().check({
      pack,
      installed: [],
      signatures: [signature],
      trust: staging,
    });

    expect(report.ok).toBe(false);
    expect(report.rejections).toContainEqual(
      expect.objectContaining({ code: "signature_verification_unavailable" }),
    );
  });

  it("keeps unavailable verification advisory only in preview", async () => {
    const report = await new CompatibilityService().check({
      pack,
      installed: [],
      signatures: [signature],
      trust: { ...staging, environment: "preview", allowExperimental: true },
    });

    expect(report.ok).toBe(true);
    expect(report.rejections).toHaveLength(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "signatures", severity: "warning", ok: true }),
    );
  });
});
