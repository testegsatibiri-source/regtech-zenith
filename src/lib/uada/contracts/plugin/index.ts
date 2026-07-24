// H12.5 — UADA plugin contract. Consumed by H19; declared now so registries
// have a stable shape from day one.

export interface UadaPluginContext {
  snapshotVersion: number;
  model: string;
}

export interface UadaPlugin {
  id: string;
  version: string;
  /** Capability ids this plugin implements or extends. */
  capabilities: string[];
  /** Health probe — returns null when healthy, error message otherwise. */
  health?: (ctx: UadaPluginContext) => Promise<string | null>;
}
