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
  /** Human label for the tier: Production / Validation / Roadmap. */
  statusLabel: string;
  /** Commercial region grouping (presentation only). */
  region: string;
  installed: boolean;
  /** Optional local market site (presentation hint only, no routing impact). */
  domain?: string;
  version?: string;
  rulesetVersion?: string;
  interfaceVersion?: string;
  signed: boolean;
  status?: InstalledPack["status"];
  reason?: string;
  /** Runtime capabilities declared by the pack manifest. */
  provides: string[];
  /** Marketing coverage lines (presentation only). */
  complianceAreas: string[];
  /** Announced capabilities for markets without a runtime engine. */
  plannedCapabilities: string[];
  languages: string[];
  /** Why the pack is not classified as production (empty when it is). */
  blockers: string[];
  health?: HealthReport["status"];
}

/** Runtime capability -> friendly product label. Single place for these strings. */
const CAPABILITY_LABELS: Record<string, string> = {
  payroll: "Payroll",
  tax: "Tax Engine",
  benefits: "Benefits",
  contributions: "Social Contributions",
  thirteenth: "Statutory Bonuses",
  overtime: "Overtime Rules",
  leave: "Leave Management",
  calendar: "Regulatory Calendar",
  contracts: "Employment Contracts",
  audit: "Audit Validation",
  rules: "Compliance Rules",
};

export function capabilityLabel(capability: string): string {
  return (
    CAPABILITY_LABELS[capability] ??
    capability.charAt(0).toUpperCase() + capability.slice(1).replace(/[-_]/g, " ")
  );
}

export const STATUS_LABELS: Record<PackTier, string> = {
  production: "Production",
  beta: "Validation",
  roadmap: "Roadmap",
};

/** Commercial region per jurisdiction (presentation only). */
const REGIONS: Record<string, string> = {
  ID: "Southeast Asia", MY: "Southeast Asia", PH: "Southeast Asia",
  SG: "Southeast Asia", VN: "Southeast Asia", TH: "Southeast Asia",
};

/** Coverage lines shown on production cards. */
const COMPLIANCE_AREAS: Record<string, string[]> = {
  ID: ["Payroll calculation", "Tax compliance", "Employee obligations"],
  PH: ["Payroll processing", "Tax calculation", "Labor compliance"],
  MY: ["Payroll calculation", "Statutory contributions"],
  VN: ["Payroll calculation", "Social insurance"],
  TH: ["Payroll calculation", "Tax compliance"],
  SG: ["Enterprise payroll", "Compliance automation"],
};

/** Announced capabilities for markets without runtime engines yet. */
const PLANNED_CAPABILITIES: Record<string, string[]> = {
  MY: ["Payroll Engine", "Tax Framework", "Employee Compliance", "Statutory Rules"],
  VN: ["Payroll", "Tax", "Insurance", "Labor Rules"],
  TH: ["Payroll", "Tax", "Benefits", "Compliance Engine"],
  SG: ["Enterprise Payroll", "API Integration", "Compliance Automation"],
};

/** Locales per planned market (installed packs read theirs from the manifest). */
const LOCALES: Record<string, string[]> = {
  MY: ["ms", "en"], VN: ["vi", "en"], TH: ["th", "en"], SG: ["en"],
};

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

/** Countries on the roadmap that have no installed pack yet. */
const ROADMAP: Array<{ code: string; name: string; nameLocal: string; flag: string; currency: string }> = [
  { code: "VN", name: "Vietnam", nameLocal: "Việt Nam", flag: "🇻🇳", currency: "VND" },
  { code: "TH", name: "Thailand", nameLocal: "ประเทศไทย", flag: "🇹🇭", currency: "THB" },
  { code: "SG", name: "Singapore", nameLocal: "Singapura", flag: "🇸🇬", currency: "SGD" },
];

const FLAGS: Record<string, string> = {
  ID: "🇮🇩", MY: "🇲🇾", PH: "🇵🇭", SG: "🇸🇬", VN: "🇻🇳", TH: "🇹🇭",
};


function major(v?: string): number {
  return Number.parseInt((v ?? "0").split(".")[0] ?? "0", 10) || 0;
}

/**
 * Cumulative gate for Production classification.
 * Structural checks run first; commercial readiness is the last gate.
 * A pack can only lose a tier, never rescue a failed structural check.
 */
export function classify(rec: InstalledPack): { tier: PackTier; blockers: string[] } {
  const m = rec.pack.manifest;
  const blockers: string[] = [];

  if (rec.status !== "installed") blockers.push(`structural: runtime status is "${rec.status}"`);
  if (major(m.version) < 1) blockers.push(`structural: pack version ${m.version} is pre-1.0`);
  if (!m.interfaceVersion) blockers.push("structural: manifest.interfaceVersion missing");
  if (!m.signatureBlock?.author?.keyId) blockers.push("structural: pack is not signed");

  // H20 — commercial readiness is independent of structural health and is shown
  // as a non-urgent compliance blocker rather than an infra failure.
  if (m.commercialReady !== true) blockers.push("regulatory correction pending");

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
  if (health !== "ok") blockers.push(`structural: health check is "${health}"`);
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
    statusLabel: STATUS_LABELS[c.tier],
    region: REGIONS[m.country] ?? "Global",
    installed: true,
    domain: DOMAINS[m.country],
    version: m.version,
    rulesetVersion: m.rulesetVersion,
    interfaceVersion: m.interfaceVersion,
    signed: !!m.signatureBlock?.author?.keyId,
    status: rec.status,
    reason: rec.reason,
    provides: [...(m.provides ?? m.engines ?? [])],
    complianceAreas: COMPLIANCE_AREAS[m.country] ?? [],
    plannedCapabilities: PLANNED_CAPABILITIES[m.country] ?? [],
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
    statusLabel: STATUS_LABELS.roadmap,
    region: REGIONS[r.code] ?? "Global",
    installed: false,
    domain: DOMAINS[r.code],
    signed: false,
    provides: [],
    complianceAreas: COMPLIANCE_AREAS[r.code] ?? [],
    plannedCapabilities: PLANNED_CAPABILITIES[r.code] ?? [],
    languages: LOCALES[r.code] ?? [],
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
