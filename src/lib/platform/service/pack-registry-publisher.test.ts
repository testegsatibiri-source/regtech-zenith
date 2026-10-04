import { afterEach, describe, expect, it } from "vitest";
import type { CountryPack } from "@/sdk/CountryPack";
import { CountryRuntime } from "@/sdk";
import { packRegistryPublisher } from "./pack-registry-publisher";

const basePack = (overrides: Partial<CountryPack["manifest"]> = {}): CountryPack => ({
  manifest: {
    country: "ZZ",
    name: "Dry Run Test",
    currency: "ZZZ",
    version: "1.0.0",
    rulesetVersion: "test-1",
    engines: [],
    provides: [],
    supportedLanguages: ["en"],
    requiresCore: ">=2.2.0",
    interfaceVersion: "1.0",
    signatureBlock: {
      author: {
        keyId: "missing-key",
        algorithm: "Ed25519",
        signature: "invalid",
        publisher: "test-publisher",
      },
    },
    ...overrides,
  },
  params: {},
  providers: {},
  supports: () => true,
  health: () => ({ status: "ok", checks: [{ name: "test", ok: true }] }),
});

describe("packRegistryPublisher.dryRun", () => {
  afterEach(() => {
    CountryRuntime.uninstall("ZZ");
    CountryRuntime.uninstall("XX");
  });

  it("never writes and blocks an artifact when trust credentials fail", async () => {
    CountryRuntime.tryInstall(basePack());

    const before = CountryRuntime.list().length;
    const result = await packRegistryPublisher.dryRun("ZZ");
    const after = CountryRuntime.list().length;

    expect(result.writeAttempted).toBe(false);
    expect(result.publishable).toBe(false);
    expect(result.artifact).toBeNull();
    expect(result.gates).toContain("key_unknown");
    expect(after).toBe(before);
  });

  it("returns blocked when the pack is not installed", async () => {
    const result = await packRegistryPublisher.dryRun("XX");

    expect(result.writeAttempted).toBe(false);
    expect(result.publishable).toBe(false);
    expect(result.gates).toEqual(["pack_not_installed"]);
  });
});
