// H11-Gates — Platform feature gates.
// Loaded once at boot from `platform_feature_gates` and cached in memory. All
// H11 behaviour changes are gated so rollout is per-environment and reversible
// without a redeploy.

export type FeatureGate =
  | "registry_enabled"
  | "compatibility_matrix"
  | "signature_enforce"
  | "config_service"
  | "bootstrap_compare";

export type GateEnv = "preview" | "staging" | "production";

export interface GateState {
  gate: FeatureGate;
  environment: GateEnv;
  enabled: boolean;
}

class FeatureGatesRegistry {
  private state = new Map<string, boolean>();
  private loaded = false;

  private key(gate: FeatureGate, env: GateEnv): string {
    return `${env}:${gate}`;
  }

  hydrate(rows: GateState[]): void {
    this.state.clear();
    for (const r of rows) this.state.set(this.key(r.gate, r.environment), r.enabled);
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  isEnabled(gate: FeatureGate, env: GateEnv = currentEnv()): boolean {
    const explicit = this.state.get(this.key(gate, env));
    if (explicit !== undefined) return explicit;
    // Safe defaults if the DB row is missing (e.g. cold start before seed replays).
    return DEFAULTS[gate][env];
  }

  snapshot(env: GateEnv = currentEnv()): Record<FeatureGate, boolean> {
    const gates: FeatureGate[] = [
      "registry_enabled",
      "compatibility_matrix",
      "signature_enforce",
      "config_service",
      "bootstrap_compare",
    ];
    return Object.fromEntries(gates.map((g) => [g, this.isEnabled(g, env)])) as Record<
      FeatureGate,
      boolean
    >;
  }
}

const DEFAULTS: Record<FeatureGate, Record<GateEnv, boolean>> = {
  registry_enabled: { preview: true, staging: true, production: false },
  compatibility_matrix: { preview: true, staging: true, production: false },
  signature_enforce: { preview: false, staging: false, production: false },
  config_service: { preview: true, staging: true, production: true },
  bootstrap_compare: { preview: true, staging: true, production: true },
};

export function currentEnv(): GateEnv {
  const raw = (typeof process !== "undefined" && process.env?.LOVABLE_ENV) || "preview";
  return (["preview", "staging", "production"] as GateEnv[]).includes(raw as GateEnv)
    ? (raw as GateEnv)
    : "preview";
}

export const FeatureGates = new FeatureGatesRegistry();
