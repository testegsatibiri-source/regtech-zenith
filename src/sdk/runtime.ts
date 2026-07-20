// H5 — Country Runtime: install/get/list/supports, with manifest validation.
import type { CountryPack } from "./CountryPack";
import type { Capability } from "./Capability";
import { CORE_VERSION, satisfies } from "./version";
import { CapabilityUnsupported, IncompatibleCoreVersion, PackNotFound } from "./errors";
import { emit as emitBus } from "@/lib/events/bus";

export type PackStatus = "installed" | "incompatible" | "failed";

export interface InstalledPack {
  pack: CountryPack;
  status: PackStatus;
  reason?: string;
}

class Runtime {
  private packs = new Map<string, InstalledPack>();

  install(pack: CountryPack): InstalledPack {
    const { manifest } = pack;
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
    const record: InstalledPack = { pack, status: "installed" };
    this.packs.set(manifest.country, record);
    void emitBus({
      type: "CountryPackInstalled@1",
      country: manifest.country,
      version: manifest.version,
      ts: new Date().toISOString(),
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
    if (!r || r.status !== "installed") throw new PackNotFound(code);
    return r.pack;
  }

  find(code: string): CountryPack | null {
    const r = this.packs.get(code);
    return r && r.status === "installed" ? r.pack : null;
  }

  supports(code: string, capability: Capability): boolean {
    const p = this.find(code);
    return !!p && p.supports(capability);
  }

  require<K extends keyof CountryPack["providers"]>(code: string, capability: Capability, key: K): NonNullable<CountryPack["providers"][K]> {
    const p = this.get(code);
    const provider = p.providers[key];
    if (!provider) throw new CapabilityUnsupported(code, capability);
    return provider as NonNullable<CountryPack["providers"][K]>;
  }

  list(): InstalledPack[] { return Array.from(this.packs.values()); }
}

export const CountryRuntime = new Runtime();
