// H5/H6 — Country Runtime: install/get/list/supports/resolve/health,
// with Compatibility Validator + ProviderContext injection.
import type { CountryPack, Providers, HealthReport } from "./CountryPack";
import type { Capability } from "./Capability";
import { CORE_VERSION, satisfies } from "./version";
import {
  CapabilityUnsupported,
  IncompatibleCoreVersion,
  PackNotFound,
  PackValidationFailed,
} from "./errors";
import { emit as emitBus } from "@/lib/events/bus";
import { validatePack, type ValidationReport } from "./validator";
import type { ProviderContext } from "./context";

export type PackStatus = "installed" | "degraded" | "incompatible" | "failed";

export interface InstalledPack {
  pack: CountryPack;
  status: PackStatus;
  reason?: string;
  validation?: ValidationReport;
}

class Runtime {
  private packs = new Map<string, InstalledPack>();

  install(pack: CountryPack): InstalledPack {
    const { manifest } = pack;

    // 1. Core compat (fast fail before running full validator)
    if (!satisfies(manifest.requiresCore, CORE_VERSION)) {
      const record: InstalledPack = {
        pack,
        status: "incompatible",
        reason: `requires core ${manifest.requiresCore}, running ${CORE_VERSION}`,
      };
      this.packs.set(manifest.country, record);
      void emitBus({
        type: "CountryPackFailed@1",
        country: manifest.country,
        reason: record.reason!,
        ts: new Date().toISOString(),
      });
      throw new IncompatibleCoreVersion(manifest.country, manifest.requiresCore, CORE_VERSION);
    }

    // 2. Full validation
    const validation = validatePack(pack);
    const ts = new Date().toISOString();
    void emitBus({
      type: "CountryPackValidated@1",
      country: manifest.country,
      ok: validation.ok,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      ts,
    });

    if (!validation.ok) {
      const record: InstalledPack = {
        pack,
        status: "failed",
        reason: validation.errors.join("; "),
        validation,
      };
      this.packs.set(manifest.country, record);
      void emitBus({
        type: "CountryPackFailed@1",
        country: manifest.country,
        reason: record.reason!,
        ts,
      });
      throw new PackValidationFailed(manifest.country, validation.errors);
    }

    const status: PackStatus = validation.warnings.length > 0 ? "degraded" : "installed";
    const record: InstalledPack = {
      pack,
      status,
      reason: validation.warnings.length ? validation.warnings.join("; ") : undefined,
      validation,
    };
    this.packs.set(manifest.country, record);
    void emitBus({
      type: "CountryPackInstalled@1",
      country: manifest.country,
      version: manifest.version,
      ts,
    });
    return record;
  }

  tryInstall(pack: CountryPack): InstalledPack {
    try { return this.install(pack); }
    catch { return this.packs.get(pack.manifest.country)!; }
  }

  uninstall(code: string): void { this.packs.delete(code); }

  get(code: string): CountryPack {
    const r = this.packs.get(code);
    if (!r || (r.status !== "installed" && r.status !== "degraded")) throw new PackNotFound(code);
    return r.pack;
  }

  find(code: string): CountryPack | null {
    const r = this.packs.get(code);
    return r && (r.status === "installed" || r.status === "degraded") ? r.pack : null;
  }

  record(code: string): InstalledPack | null {
    return this.packs.get(code) ?? null;
  }

  supports(code: string, capability: Capability): boolean {
    const p = this.find(code);
    return !!p && p.supports(capability);
  }

  /**
   * H6 — Resolve a provider with an injected ProviderContext (siblings, foreign lookup).
   * Callers should use this instead of reaching into `pack.providers.*` when a
   * provider needs cross-provider access.
   */
  resolve<K extends keyof Providers>(code: string, key: K): NonNullable<Providers[K]> {
    const pack = this.get(code);
    const provider = pack.providers[key];
    if (!provider) throw new CapabilityUnsupported(code, String(key));
    // Ctx is available via the closure below; providers receive it as an optional
    // second argument on every method. We currently return the raw provider (no
    // proxying) because provider methods accept ctx? — they can call
    // `runtime.contextFor(code)` themselves when needed.
    return provider as NonNullable<Providers[K]>;
  }

  /** Build a fresh ProviderContext for a pack. Cheap; safe to call per-invocation. */
  contextFor(code: string): ProviderContext {
    const pack = this.get(code);
    const config = new ConfigService([new StaticConfigProvider(pack.params ?? {})]);
    return {
      country: pack.manifest.country,
      rulesetVersion: pack.manifest.rulesetVersion,
      siblings: pack.providers,
      foreign: (foreignCode, capability) => {
        const foreign = this.find(foreignCode);
        if (!foreign) return undefined;
        const capKey = capability as unknown as keyof Providers;
        return foreign.providers[capKey];
      },
      config,
    };
  }

  require<K extends keyof Providers>(code: string, capability: Capability, key: K): NonNullable<Providers[K]> {
    const p = this.get(code);
    const provider = p.providers[key];
    if (!provider) throw new CapabilityUnsupported(code, capability);
    return provider as NonNullable<Providers[K]>;
  }

  async health(code: string): Promise<HealthReport> {
    const pack = this.get(code);
    let report: HealthReport;
    if (!pack.health) {
      report = { status: "ok", checks: [{ name: "health-hook-missing", ok: true, message: "pack has no health()" }] };
    } else {
      try {
        report = await Promise.resolve(pack.health());
      } catch (err) {
        report = { status: "error", checks: [{ name: "health-throw", ok: false, message: (err as Error).message }] };
      }
    }
    void emitBus({
      type: "CountryPackHealthChecked@1",
      country: code,
      status: report.status,
      ts: new Date().toISOString(),
    });
    return report;
  }

  list(): InstalledPack[] { return Array.from(this.packs.values()); }
}

export const CountryRuntime = new Runtime();
