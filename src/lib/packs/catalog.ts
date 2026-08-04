// H17 — Country Pack presentation catalog.
// SINGLE SOURCE OF TRUTH for "what is production vs. beta vs. roadmap".
// Pure presentation layer: reads CountryRuntime only, performs no I/O and is
// never imported by Core or by a pack (ADR-0032).
import { CountryRuntime, type InstalledPack, type HealthReport } from "@/sdk";
import "@/sdk/bootstrap";

export type PackTier = "production" | "beta" | "roadmap";

export interface CatalogEntry {
  code: string;
  name: string;
  nameLocal?: string;
  flag: string;
  currency: string;
  tier: PackTier;
  installed: boolean;
  /** Optional local market site (presentation hint only, no routing impact). */
  domain?: string;
  version?: string;
  rulesetVersion?: string;
  interfaceVersion?: string;
  signed: boolean;
  status?: InstalledPack["status"];
  reason?: string;
  provides: string[];
  languages: string[];
  /** Why the pack is not classified as production (empty when it is). */
  blockers: string[];
  health?: HealthReport["status"];
}

/** Countries on the roadmap that have no installed pack yet. */
const ROADMAP: Array<{ code: string; name: string; nameLocal: string; flag: string; currency: string }> = [
  { code: "VN", name: "Vietnam", nameLocal: "Việt Nam", flag: "🇻🇳", currency: "VND" },
  { code: "TH", name: "Thailand", nameLocal: "ประเทศไทย", flag: "🇹🇭", currency: "THB" },
  { code: "SG", name: "Singapore", nameLocal: "Singapura", flag: "🇸🇬", currency: "SGD" },
];

/**
 * Local market sites per jurisdiction. Presentation only — adding a market
 * here never changes routing, which always stays on /packs/$country.
 */
const DOMAINS: Record<string, string> = {
  ID: "uboardhr.id",
  PH: "uboardhr.ph",
  MY: "uboardhr.my",
  TH: "uboardhr.co.th",
  VN: "uboardhr.vn",
};

const FLAGS: Record<string, string> = {
  ID: "🇮🇩", MY: "🇲🇾", PH: "🇵🇭", SG: "🇸🇬", VN: "🇻🇳", TH: "🇹🇭",
};

function major(v?: string): number {
  return Number.parseInt((v ?? "0").split(".")[0] ?? "0", 10) || 0;
}

/**
 * Step 1 + 2 of the cumulative gate: runtime status and version/signature.
 * Health (step 3) is evaluated by `classifyWithHealth`.
 */
export function classify(rec: InstalledPack): { tier: PackTier; blockers: string[] } {
  const m = rec.pack.manifest;
  const blockers: string[] = [];

  if (rec.status !== "installed") blockers.push(`runtime status is "${rec.status}"`);
  if (major(m.version) < 1) blockers.push(`pack version ${m.version} is pre-1.0`);
  if (!m.interfaceVersion) blockers.push("manifest.interfaceVersion missing");
  if (!m.signatureBlock?.author?.keyId) blockers.push("pack is not signed");

  return { tier: blockers.length === 0 ? "production" : "beta", blockers };
}

/** Full cumulative gate — adds live `health()` as the third step. */
export async function classifyWithHealth(
  rec: InstalledPack,
): Promise<{ tier: PackTier; blockers: string[]; health?: HealthReport["status"] }> {
  const base = classify(rec);
  let health: HealthReport["status"] | undefined;
  try {
    const report = await CountryRuntime.health(rec.pack.manifest.country);
    health = report.status;
  } catch {
    health = "error";
  }
  const blockers = [...base.blockers];
  if (health !== "ok") blockers.push(`health check is "${health}"`);
  return { tier: blockers.length === 0 ? "production" : "beta", blockers, health };
}

function toEntry(
  rec: InstalledPack,
  c: { tier: PackTier; blockers: string[]; health?: HealthReport["status"] },
): CatalogEntry {
  const m = rec.pack.manifest;
  return {
    code: m.country,
    name: m.name,
    flag: FLAGS[m.country] ?? "🏳️",
    currency: m.currency,
    tier: c.tier,
    installed: true,
    domain: DOMAINS[m.country],
    version: m.version,
    rulesetVersion: m.rulesetVersion,
    interfaceVersion: m.interfaceVersion,
    signed: !!m.signatureBlock?.author?.keyId,
    status: rec.status,
    reason: rec.reason,
    provides: [...(m.provides ?? m.engines ?? [])],
    languages: [...(m.supportedLanguages ?? [])],
    blockers: c.blockers,
    health: c.health,
  };
}

function roadmapEntries(installedCodes: Set<string>): CatalogEntry[] {
  return ROADMAP.filter((r) => !installedCodes.has(r.code)).map((r) => ({
    code: r.code,
    name: r.name,
    nameLocal: r.nameLocal,
    flag: r.flag,
    currency: r.currency,
    tier: "roadmap" as const,
    installed: false,
    domain: DOMAINS[r.code],
    signed: false,
    provides: [],
    languages: [],
    blockers: ["pack not implemented yet"],
  }));
}

/** Synchronous catalog — no health gate. Safe for instant renders. */
export function listCatalog(): CatalogEntry[] {
  const installed = CountryRuntime.list();
  const entries = installed.map((rec) => toEntry(rec, classify(rec)));
  return [...entries, ...roadmapEntries(new Set(entries.map((e) => e.code)))];
}

/**
 * Authoritative catalog — evaluates live health for every installed pack.
 * Public SSR routes MUST use this so a pack that degrades after promotion
 * drops out of the production showcase on the very next request.
 */
export async function listCatalogWithHealth(): Promise<CatalogEntry[]> {
  const installed = CountryRuntime.list();
  const entries = await Promise.all(
    installed.map(async (rec) => toEntry(rec, await classifyWithHealth(rec))),
  );
  return [...entries, ...roadmapEntries(new Set(entries.map((e) => e.code)))];
}

/** Returns the entry only when it is production-grade; otherwise undefined. */
export async function getProductionPack(code: string): Promise<CatalogEntry | undefined> {
  const upper = code.toUpperCase();
  const entry = (await listCatalogWithHealth()).find((e) => e.code === upper);
  return entry && entry.tier === "production" ? entry : undefined;
}

export const TIER_ORDER: PackTier[] = ["production", "beta", "roadmap"];
