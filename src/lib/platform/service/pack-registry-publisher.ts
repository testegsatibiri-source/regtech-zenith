// H11.2 — Pack Registry Publisher (dry-run first).
// This module deliberately has no Supabase write path.
// It builds the exact registry artifact that a future publisher will persist,
// but publication is refused unless validator + health + compatibility/signature
// gates all pass. This prevents false published records while Trust Store
// credentials are still being provisioned.
import type { CountryPack } from "@/sdk/CountryPack";
import type { InstalledPack } from "@/sdk/runtime";
import type { CompatibilityReport } from "@/sdk/compatibility";
import type { TrustStore } from "@/sdk/trust-store";
import type { TrustPolicy } from "@/sdk/trust-policy";
import { CountryRuntime } from "@/sdk";
import { compatibilityService } from "@/sdk/compatibility";
import { currentTrustPolicy } from "@/sdk/trust-policy";
import { signatureBlockToRecords } from "@/sdk/signature-adapter";
import { canonicalManifestBytes } from "@/packs/indonesia/params/canonical-manifest";
import { trustStore } from "@/lib/platform/service/signing";

export interface PackRegistrySignatureArtifact {
  signer: string;
  keyId: string;
  algorithm: "Ed25519";
  signature: string;
  capability: "pack.sign" | "pack.countersign";
  ts: string;
}

export interface PackRegistryAuditArtifact {
  action: "pack_registry.publish.dry_run";
  component: "pack_registry.publisher";
  target: string;
  outcome: "would_publish" | "blocked";
  writeAttempted: false;
  reasonCodes: string[];
  generatedAt: string;
}

export interface PackRegistryPublishArtifact {
  countryCode: string;
  packVersion: string;
  interfaceVersion: string;
  requiresCore: string;
  publisher: string;
  state: "published";
  manifest: CountryPack["manifest"];
  checksum: string;
  signatures: PackRegistrySignatureArtifact[];
  compatibilityReport: CompatibilityReport;
  audit: PackRegistryAuditArtifact;
}

export interface PackRegistryDryRunResult {
  ok: boolean;
  publishable: boolean;
  writeAttempted: false;
  artifact: PackRegistryPublishArtifact | null;
  gates: string[];
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("SHA-256 unavailable: Web Crypto is required");
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function signatureArtifacts(pack: CountryPack): PackRegistrySignatureArtifact[] {
  const block = pack.manifest.signatureBlock;
  if (!block) return [];
  return [
    {
      signer: block.author.publisher ?? "",
      keyId: block.author.keyId,
      algorithm: block.author.algorithm,
      signature: block.author.signature,
      capability: "pack.sign",
      ts: block.author.ts ?? "",
    },
    ...(block.countersign
      ? [
          {
            signer: block.countersign.publisher ?? "",
            keyId: block.countersign.keyId,
            algorithm: block.countersign.algorithm,
            signature: block.countersign.signature,
            capability: "pack.countersign" as const,
            ts: block.countersign.ts ?? "",
          },
        ]
      : []),
  ];
}

export const packRegistryPublisher = {
  async dryRun(
    country: string,
    options: { trustStore?: TrustStore } = {},
  ): Promise<PackRegistryDryRunResult> {
    const rec: InstalledPack | null = CountryRuntime.record(country);
    const generatedAt = new Date().toISOString();

    if (!rec) {
      return {
        ok: false,
        publishable: false,
        writeAttempted: false,
        artifact: null,
        gates: ["pack_not_installed"],
      };
    }

    const gates: string[] = [];
    if (rec.validation && rec.validation.errors.length > 0) {
      gates.push("validator_failed");
    }

    let healthOk = false;
    try {
      const health = await CountryRuntime.health(country);
      healthOk = health.status !== "error";
      if (!healthOk) gates.push("health_failed");
    } catch {
      gates.push("health_failed");
    }

    const trust = options.trustPolicy ?? currentTrustPolicy();
    const signatures = signatureBlockToRecords(rec.pack.manifest.signatureBlock);
    const manifestBytes = canonicalManifestBytes(rec.pack.manifest);
    let compatibilityReport: CompatibilityReport;
    try {
      compatibilityReport = await compatibilityService.check({
        pack: rec.pack,
        installed: CountryRuntime.list(),
        signatures,
        trust,
        trustStore: options.trustStore ?? trustStore,
        manifestBytes,
      });
      if (!compatibilityReport.ok) {
        gates.push(...compatibilityReport.rejections.map((r) => r.code));
      }
    } catch {
      compatibilityReport = {
        ok: false,
        engineVersion: compatibilityService.engineVersion,
        matrixVersion: "unknown",
        checks: [],
        rejections: [
          {
            code: "signature_verification_unavailable",
            message: "compatibility gate threw while validating the registry artifact",
          },
        ],
      };
      gates.push("signature_verification_unavailable");
    }

    if (!rec.pack.manifest.interfaceVersion) gates.push("interface_version_missing");
    if (!rec.pack.manifest.signatureBlock) gates.push("signature_block_missing");

    const publishable = gates.length === 0 && healthOk && compatibilityReport.ok;
    const reasonCodes = [...new Set(gates)];
    const audit: PackRegistryAuditArtifact = {
      action: "pack_registry.publish.dry_run",
      component: "pack_registry.publisher",
      target: rec.pack.manifest.country + "@" + rec.pack.manifest.version,
      outcome: publishable ? "would_publish" : "blocked",
      writeAttempted: false,
      reasonCodes,
      generatedAt,
    };

    if (!publishable) {
      return {
        ok: false,
        publishable: false,
        writeAttempted: false,
        artifact: null,
        gates: reasonCodes,
      };
    }

    const checksum = await sha256Hex(canonicalManifestBytes(rec.pack.manifest));
    const sigs = signatureArtifacts(rec.pack);
    const publisher = rec.pack.manifest.signatureBlock?.author.publisher ?? "";

    return {
      ok: true,
      publishable: true,
      writeAttempted: false,
      artifact: {
        countryCode: rec.pack.manifest.country,
        packVersion: rec.pack.manifest.version,
        interfaceVersion: rec.pack.manifest.interfaceVersion!,
        requiresCore: rec.pack.manifest.requiresCore,
        publisher,
        state: "published",
        manifest: rec.pack.manifest,
        checksum,
        signatures: sigs,
        compatibilityReport,
        audit,
      },
      gates: [],
    };
  },
};
