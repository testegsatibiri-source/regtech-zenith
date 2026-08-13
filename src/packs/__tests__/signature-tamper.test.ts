// H20 — Tamper-evidence tests for the commercialReady signature gate.
// Verifies that signing over canonical manifest bytes without the
// commercialReady field, or with a flipped value, fails verification against
// the current signed manifest.
import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyEd25519 } from "@/sdk/signing";
import { canonicalManifestBytes } from "@/packs/indonesia/params/canonical-manifest";
import type { CountryManifest } from "@/sdk/manifest";

function makeManifest(overrides: Partial<CountryManifest> = {}): CountryManifest {
  return {
    country: "XX",
    name: "Test Pack",
    currency: "USD",
    version: "1.0.0",
    rulesetVersion: "XX-2024.0",
    provides: [],
    engines: [],
    supportedLanguages: ["en"],
    requiresCore: ">=2.0.0",
    interfaceVersion: "1.0.0",
    commercialReady: true,
    ...overrides,
  };
}

function signBytes(bytes: Uint8Array, privateKey: any): string {
  return sign(null, bytes, privateKey).toString("base64");
}

function exportRawPublicKey(publicKey: any): string {
  // Node raw Ed25519 export returns the 32-byte key; encode it as base64 for
  // the Web Crypto verifier used in verifyEd25519.
  const buf = publicKey.export({ type: "raw", format: "der" });
  return Buffer.from(buf).toString("base64");
}


describe("H20 — commercialReady signature tamper", () => {
  it("accepts a signature computed over the canonical bytes including commercialReady", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const manifest = makeManifest({ commercialReady: true });
    const bytes = canonicalManifestBytes(manifest);
    const sig = signBytes(bytes, privateKey);
    const result = await verifyEd25519(bytes, sig, exportRawPublicKey(publicKey));
    if (!result.ok) {
      throw new Error(`verify error: ${(result as { reason: string }).reason}`);
    }
    expect(result.verified).toBe(true);
  });

  it("rejects a signature computed without commercialReady when the manifest declares it", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const oldManifest = makeManifest({ commercialReady: undefined });
    const oldBytes = canonicalManifestBytes(oldManifest);
    const sig = signBytes(oldBytes, privateKey);

    const newManifest = makeManifest({ commercialReady: true });
    const newBytes = canonicalManifestBytes(newManifest);
    const result = await verifyEd25519(newBytes, sig, exportRawPublicKey(publicKey));
    if (!result.ok) {
      throw new Error(`verify error: ${(result as { reason: string }).reason}`);
    }
    expect(result.verified).toBe(false);
  });

  it("rejects a manifest whose commercialReady was flipped after signing", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const manifest = makeManifest({ commercialReady: false });
    const bytes = canonicalManifestBytes(manifest);
    const sig = signBytes(bytes, privateKey);

    const tampered = makeManifest({ commercialReady: true });
    const tamperedBytes = canonicalManifestBytes(tampered);
    const result = await verifyEd25519(tamperedBytes, sig, exportRawPublicKey(publicKey));
    if (!result.ok) {
      throw new Error(`verify error: ${(result as { reason: string }).reason}`);
    }
    expect(result.verified).toBe(false);
  });

  it("rejects a manifest whose commercialReady was flipped from true to false", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const manifest = makeManifest({ commercialReady: true });
    const bytes = canonicalManifestBytes(manifest);
    const sig = signBytes(bytes, privateKey);

    const tampered = makeManifest({ commercialReady: false });
    const tamperedBytes = canonicalManifestBytes(tampered);
    const result = await verifyEd25519(tamperedBytes, sig, exportRawPublicKey(publicKey));
    if (!result.ok) {
      throw new Error(`verify error: ${(result as { reason: string }).reason}`);
    }
    expect(result.verified).toBe(false);
  });
});
