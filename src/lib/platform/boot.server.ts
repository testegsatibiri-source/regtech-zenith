// H11-Boot / H11.1a — server-only helpers for the Boot Gate.
// Persists boot reports and per-pack compatibility reports.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  runBootGate,
  getReadinessReport,
  type ReadinessReport,
  type RegistryPackRow,
} from "@/sdk/boot";
import { CORE_VERSION, CountryRuntime } from "@/sdk";
import { compatibilityService, COMPATIBILITY_ENGINE_VERSION } from "@/sdk/compatibility";
import { COMPATIBILITY_MATRIX_V1 } from "@/sdk/compatibility-matrix";
import { currentEnv } from "@/sdk/feature-gates";
import { currentTrustPolicy } from "@/sdk/trust-policy";
import { trustStore } from "@/lib/platform/service/signing";
import { canonicalManifestBytes } from "@/packs/indonesia/params/canonical-manifest";
import { signatureBlockToRecords } from "@/sdk/signature-adapter";

async function loadGates() {
  const { data, error } = await supabaseAdmin
    .from("platform_feature_gates")
    .select("gate, environment, enabled");
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ gate: string; environment: string; enabled: boolean }> as never;
}

async function loadRegistry(): Promise<RegistryPackRow[]> {
  const { data, error } = await supabaseAdmin
    .from("pack_registry")
    .select("country_code, pack_version, checksum, state")
    .in("state", ["published", "approved", "deprecated"]);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    country: r.country_code,
    version: r.pack_version,
    checksum: r.checksum,
  }));
}

let bootPromise: Promise<ReadinessReport> | null = null;

async function persistCompatReports(): Promise<void> {
  const env = currentEnv();
  const trust = currentTrustPolicy();
  const installed = CountryRuntime.list();
  const packsInRegistry = await supabaseAdmin
    .from("pack_registry")
    .select("id, country_code, pack_version, signatures")
    .eq("state", "published");
  const registryById = new Map<string, { id: string; sigs: unknown[] }>();
  for (const r of packsInRegistry.data ?? []) {
    registryById.set(`${r.country_code}@${r.pack_version}`, {
      id: r.id,
      sigs: (r.signatures as unknown[]) ?? [],
    });
  }

  for (const rec of installed) {
    const m = rec.pack.manifest;
    const regEntry = registryById.get(`${m.country}@${m.version}`);
    // Verify the signature block shipped with the actual runtime artifact. Registry
    // publication is tracked separately by the boot gate; an absent registry row must
    // not erase the artifact signatures, nor make the pack appear published.
    const registrySignatures = regEntry?.sigs ?? [];
    const artifactSignatures = registrySignatures.length
      ? (registrySignatures as Parameters<typeof compatibilityService.check>[0]["signatures"])
      : signatureBlockToRecords(m.signatureBlock);
    // Do not pre-filter by required capabilities here: production requires both
    // author and countersign records. CompatibilityService must see the complete
    // signature set so it can validate count, distinct signers, and each capability.
    const signatures = artifactSignatures ?? [];
    try {
      const report = await compatibilityService.check({
        pack: rec.pack,
        installed,
        signatures,
        trust,
        trustStore,
        manifestBytes: canonicalManifestBytes(m),
      });
      await supabaseAdmin.from("compatibility_reports").insert({
        pack_country: m.country,
        pack_version: m.version,
        engine_version: report.engineVersion,
        matrix_version: report.matrixVersion,
        ok: report.ok,
        checks: JSON.parse(JSON.stringify(report.checks)),
        rejections: JSON.parse(JSON.stringify(report.rejections)),
        environment: env,
        source: "boot",
        published_report_ref: regEntry?.id ?? null,
      });
    } catch {
      /* boot must not fail on transient compat writes */
    }
  }
  void COMPATIBILITY_ENGINE_VERSION;
  void COMPATIBILITY_MATRIX_V1;
}

export async function ensureBoot(): Promise<ReadinessReport> {
  if (!bootPromise) {
    bootPromise = (async () => {
      const report = await runBootGate({ loadGates, loadRegistry });
      try {
        await supabaseAdmin.from("runtime_boot_reports").insert({
          ready: report.status === "ready" || report.status === "degraded",
          environment: currentEnv(),
          runtime_version: CORE_VERSION,
          sdk_version: CORE_VERSION,
          report: JSON.parse(JSON.stringify(report)),
        });
      } catch {
        /* boot must not fail if persistence is transient */
      }
      void persistCompatReports();
      return report;
    })();
  }
  return bootPromise;
}

export function currentReadiness(): ReadinessReport {
  return getReadinessReport();
}
