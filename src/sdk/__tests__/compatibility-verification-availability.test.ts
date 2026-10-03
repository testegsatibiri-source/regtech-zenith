import { describe, expect, it } from "vitest";
import { CompatibilityService } from "@/sdk/compatibility";
import type { CountryPack } from "@/sdk/CountryPack";
import type { TrustPolicy } from "@/sdk/trust-policy";
import type { TrustStore } from "@/sdk/trust-store";

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

  it("fails closed outside preview when the Ed25519 runtime is unavailable", async () => {
    const key = {
      keyId: "key-a",
      publisher: "publisher-a",
      publicKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      algo: "ed25519",
      capabilities: ["pack.sign"] as ("pack.sign" | "pack.countersign")[],
      provider: "db" as const,
      active: true,
    };
    const trustStore: TrustStore = {
      name: "test",
      listActive: async () => [key],
      find: async () => key,
      findByKeyId: async () => key,
    };

    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
    try {
      const report = await new CompatibilityService().check({
        pack,
        installed: [],
        signatures: [signature],
        trust: staging,
        trustStore,
        manifestBytes: new Uint8Array([1, 2, 3]),
      });

      expect(report.ok).toBe(false);
      expect(report.rejections).toContainEqual(
        expect.objectContaining({ code: "signature_verification_unavailable" }),
      );
    } finally {
      if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto);
      else Reflect.deleteProperty(globalThis, "crypto");
    }
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
