import { describe, expect, it, vi } from "vitest";
import { CompatibilityService } from "@/sdk/compatibility";
import type { CountryPack } from "@/sdk/CountryPack";
import type { TrustStore } from "@/sdk/trust-store";
import type { PackSignatureRecord } from "@/sdk/signing";
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

const trust: TrustPolicy = {
  environment: "staging",
  requiredSignatures: 1,
  requiredCapabilities: ["pack.sign"],
  distinctSigners: false,
  allowExperimental: true,
};

const signature: PackSignatureRecord = {
  signer: "publisher-a",
  keyId: "unknown-key-id",
  publicKey: "legacy-public-key",
  algo: "ed25519",
  signature: "signature",
  capability: "pack.sign",
  ts: "2026-01-01T00:00:00Z",
};

describe("CompatibilityService signature key lookup", () => {
  it("does not fall back to publisher/publicKey when an explicit keyId is unknown", async () => {
    const find = vi.fn(async () => ({
      keyId: "different-key",
      publisher: "publisher-a",
      publicKey: "legacy-public-key",
      algo: "ed25519",
      capabilities: ["pack.sign"] as ("pack.sign" | "pack.countersign")[],
      provider: "db" as const,
      active: true,
    }));
    const trustStore: TrustStore = {
      name: "test",
      listActive: async () => [],
      find,
      findByKeyId: async () => undefined,
    };

    const report = await new CompatibilityService().check({
      pack,
      installed: [],
      signatures: [signature],
      trust,
      trustStore,
      manifestBytes: new Uint8Array([1]),
    });

    expect(find).not.toHaveBeenCalled();
    expect(report.rejections).toContainEqual(
      expect.objectContaining({ code: "key_unknown", signer: "publisher-a" }),
    );
  });
});
