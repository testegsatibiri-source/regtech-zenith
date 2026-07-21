// H10-Cfg — Configuration Service with pluggable providers.
// H10 ships the interface + StaticProvider. H12 will add Database/Env/Flag
// providers without touching this service or any pack.

export interface ConfigContext {
  country: string;
  customerId?: string;
  environment?: string;
  correlationId?: string;
}

export type ConfigValue = string | number | boolean | null | Record<string, unknown> | unknown[];

export interface ConfigProvider {
  /** Stable name for logs/audits. */
  name: string;
  /** Lower value = higher precedence (checked first). */
  priority: number;
  get(key: string, ctx: ConfigContext): Promise<ConfigValue | undefined> | ConfigValue | undefined;
}

export class ConfigMissing extends Error {
  code = "CONFIG_MISSING" as const;
  constructor(public key: string, public country: string) {
    super(`missing config '${key}' for country '${country}'`);
  }
}

export class ConfigService {
  private readonly ordered: ConfigProvider[];
  constructor(providers: ConfigProvider[]) {
    this.ordered = [...providers].sort((a, b) => a.priority - b.priority);
  }
  providers(): readonly ConfigProvider[] { return this.ordered; }

  async resolve(key: string, ctx: ConfigContext): Promise<ConfigValue> {
    for (const p of this.ordered) {
      const v = await p.get(key, ctx);
      if (v !== undefined) return v;
    }
    throw new ConfigMissing(key, ctx.country);
  }

  async tryResolve(key: string, ctx: ConfigContext): Promise<ConfigValue | undefined> {
    for (const p of this.ordered) {
      const v = await p.get(key, ctx);
      if (v !== undefined) return v;
    }
    return undefined;
  }
}

/** Reads from the pack's static `params` map. Lowest precedence (fallback). */
export class StaticConfigProvider implements ConfigProvider {
  name = "static";
  priority = 1000;
  constructor(private readonly params: Record<string, unknown>) {}
  get(key: string): ConfigValue | undefined {
    return (this.params[key] as ConfigValue | undefined) ?? undefined;
  }
}
