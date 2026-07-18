// H2 — Registry of Country Packs.
import type { CountryCode, CountryPack } from "./types";
import { indonesiaPack } from "./id-pack";

const REGISTRY = new Map<CountryCode, CountryPack>();

export function registerPack(pack: CountryPack): void {
  REGISTRY.set(pack.code, pack);
}

export function getPack(code: CountryCode): CountryPack {
  const p = REGISTRY.get(code);
  if (!p) throw new Error(`Country pack not registered: ${code}`);
  return p;
}

export function listPacks(): CountryPack[] {
  return Array.from(REGISTRY.values());
}

// Bootstrap: register built-in packs.
registerPack(indonesiaPack);
