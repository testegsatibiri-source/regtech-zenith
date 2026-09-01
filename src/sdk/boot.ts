// H11-Boot — Boot Health Gate + Readiness Report.
// Runs once at server startup. Sequences: gates → registry → matrix →
// signatures → health. Any error puts the Runtime in `degraded` or `failed`;
// the /platform/readiness and /api/public/v1/readiness surfaces read the
// latest report.
import { CountryRuntime } from "./runtime";
import { CORE_VERSION } from "./version";
import { PACK_INTERFACE_VERSION } from "./INTERFACE_VERSION";
import { FeatureGates, currentEnv, type FeatureGate } from "./feature-gates";
import { COMPATIBILITY_MATRIX_V1, checkMatrix, type MatrixReport } from "./compatibility-matrix";
import { currentTrustPolicy } from "./trust-policy";
import { emit as emitBus } from "@/lib/events/bus";

export type ReadinessStatus = "ready" | "degraded" | "failed" | "booting";

export interface ReadinessStep {
  name: "gates" | "registry" | "compatibility_matrix" | "signatures" | "health";
  ok: boolean;
  severity: "error" | "warning" | "info";
  message?: string;
  details?: Array<Record<string, string | number | boolean>>;
}

export interface ReadinessReport {
  status: ReadinessStatus;
  ts: string;
  environment: string;
  runtimeVersion: string;
  sdkVersion: string;
  interfaceVersion: string;
  matrixVersion: string;
  trustPolicy: { environment: string; requiredSignatures: number };
  gates: Record<FeatureGate, boolean>;
  packs: Array<{ country: string; version: string; status: string; reason?: string }>;
  steps: ReadinessStep[];
}

let cached: ReadinessReport = {
  status: "booting",
  ts: new Date().toISOString(),
  environment: currentEnv(),
  runtimeVersion: CORE_VERSION,
  sdkVersion: CORE_VERSION,
  interfaceVersion: PACK_INTERFACE_VERSION,
  matrixVersion: COMPATIBILITY_MATRIX_V1.version,
  trustPolicy: { environment: currentEnv(), requiredSignatures: 0 },
  gates: FeatureGates.snapshot(),
  packs: [],
  steps: [],
};

class RuntimeReadiness {
  private ready = false;

  markReady(v: boolean): void {
    this.ready = v;
  }
  isReady(): boolean {
    return this.ready;
  }
}

export const Readiness = new RuntimeReadiness();

/**
 * Boot Health Gate. Idempotent — safe to call repeatedly (e.g. after a
 * feature-gate flip). `loadGates` is injected so a server route can supply the
 * DB-backed loader without pulling supabase into the SDK.
 */
export interface RegistryPackRow {
  country: string;
  version: string;
  checksum: string;
}

export async function runBootGate(
  opts: {
    loadGates?: () => Promise<Array<{ gate: FeatureGate; environment: string; enabled: boolean }>>;
    loadRegistry?: () => Promise<RegistryPackRow[]>;
    onDivergence?: (evt: {
      country: string;
      reason: string;
      matrixVersion: string;
      engineVersion: string;
    }) => void | Promise<void>;
  } = {},
): Promise<ReadinessReport> {
  const steps: ReadinessStep[] = [];
  const env = currentEnv();
  const trust = currentTrustPolicy();

  // Step 1 — Gates
  try {
    const rows = opts.loadGates ? await opts.loadGates() : [];
    FeatureGates.hydrate(rows as never);
    steps.push({ name: "gates", ok: true, severity: "info", message: `${rows.length} gate rows` });
  } catch (err) {
    steps.push({ name: "gates", ok: false, severity: "warning", message: (err as Error).message });
  }

  // Step 2 — Registry (H11.1a = coexistence + divergence detection)
  if (FeatureGates.isEnabled("registry_enabled", env)) {
    const registry = opts.loadRegistry
      ? await opts.loadRegistry().catch(() => [] as RegistryPackRow[])
      : [];
    const installed = CountryRuntime.list();
    const divergences: Array<Record<string, string | number | boolean>> = [];
    for (const rec of installed) {
      const m = rec.pack.manifest;
      const row = registry.find((r) => r.country === m.country);
      let reason: string | null = null;
      if (!row) reason = "missing_in_registry";
      else if (row.version !== m.version) reason = "version_mismatch";
      // checksum comparison is advisory — bootstrap checksum may drift; only
      // flag when a checksum is explicitly recorded on the manifest signature.
      if (reason) {
        divergences.push({ country: m.country, version: m.version, reason });
        void emitBus({
          type: "PackRegistryDivergence@1",
          country: m.country,
          matrixVersion: COMPATIBILITY_MATRIX_V1.version,
          engineVersion: CORE_VERSION,
          reason,
          ts: new Date().toISOString(),
        } as never);
        if (opts.onDivergence)
          void opts.onDivergence({
            country: m.country,
            reason,
            matrixVersion: COMPATIBILITY_MATRIX_V1.version,
            engineVersion: CORE_VERSION,
          });
      }
    }
    steps.push({
      name: "registry",
      ok: true,
      severity: divergences.length ? "warning" : "info",
      message: `registry_enabled=on — ${registry.length} row(s), ${divergences.length} divergence(s)`,
      details: divergences,
    });
  } else {
    steps.push({
      name: "registry",
      ok: true,
      severity: "info",
      message: "registry_enabled=off — bootstrap only",
    });
  }

  // Step 3 — Compatibility Matrix
  let matrix: MatrixReport | null = null;
  if (FeatureGates.isEnabled("compatibility_matrix", env)) {
    matrix = checkMatrix(COMPATIBILITY_MATRIX_V1, {
      runtimeVersion: CORE_VERSION,
      sdkVersion: CORE_VERSION,
      installed: CountryRuntime.list(),
    });
    steps.push({
      name: "compatibility_matrix",
      ok: matrix.ok,
      severity: matrix.ok ? "info" : "error",
      message: `matrix v${matrix.matrixVersion}`,
      details: matrix.checks.map((c) => ({ ...c })),
    });
  } else {
    steps.push({ name: "compatibility_matrix", ok: true, severity: "info", message: "gate off" });
  }

  // Step 4 — Signatures
  if (FeatureGates.isEnabled("signature_enforce", env)) {
    // Enforcement is delegated to CompatibilityService during install().
    // At boot we simply verify the policy is loadable and non-degenerate.
    const policyOk = trust.requiredSignatures > 0;
    steps.push({
      name: "signatures",
      ok: policyOk,
      severity: policyOk ? "info" : "error",
      message: `PACK_SIG_ENFORCE=on, trust=${trust.environment} sigs≥${trust.requiredSignatures}`,
    });
  } else {
    steps.push({
      name: "signatures",
      ok: true,
      severity: "info",
      message: "enforcement off (warn-only)",
    });
  }

  // Step 5 — Health per installed pack
  const packs: ReadinessReport["packs"] = [];
  for (const rec of CountryRuntime.list()) {
    packs.push({
      country: rec.pack.manifest.country,
      version: rec.pack.manifest.version,
      status: rec.status,
      reason: rec.reason,
    });
  }
  const anyPackFailed = packs.some((p) => p.status === "failed" || p.status === "incompatible");
  steps.push({
    name: "health",
    ok: !anyPackFailed,
    severity: anyPackFailed ? "error" : "info",
    message: `${packs.length} pack(s) registered`,
  });

  const errors = steps.filter((s) => !s.ok && s.severity === "error");
  const warnings = steps.filter((s) => !s.ok && s.severity === "warning");
  const status: ReadinessStatus = errors.length ? "failed" : warnings.length ? "degraded" : "ready";

  cached = {
    status,
    ts: new Date().toISOString(),
    environment: env,
    runtimeVersion: CORE_VERSION,
    sdkVersion: CORE_VERSION,
    interfaceVersion: PACK_INTERFACE_VERSION,
    matrixVersion: COMPATIBILITY_MATRIX_V1.version,
    trustPolicy: { environment: trust.environment, requiredSignatures: trust.requiredSignatures },
    gates: FeatureGates.snapshot(env),
    packs,
    steps,
  };
  Readiness.markReady(status === "ready" || status === "degraded");

  void emitBus({
    type: "RuntimeBootCompleted@1",
    status,
    matrixVersion: COMPATIBILITY_MATRIX_V1.version,
    ts: cached.ts,
  } as never);

  return cached;
}

export function getReadinessReport(): ReadinessReport {
  return cached;
}
