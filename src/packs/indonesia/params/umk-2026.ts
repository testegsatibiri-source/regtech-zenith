// H23-A0 — UMK (kabupaten/kota minimum wage) table and the UMP -> UMK resolution
// hierarchy.
//
// Legal basis: PP 36/2021 jo. Permenaker 16/2024 — a Governor MAY set a
// district/city minimum wage (UMK) above the provincial floor (UMP). Where an
// UMK exists it is the binding floor for employers in that regency/city; where
// it does not, the UMP applies.
//
// EPISTEMIC HONESTY RULE (ADR-0038): no figure here may be marked "official"
// without the corresponding SK Gubernur. The 2026 SK Gubernur decrees for the
// UMK layer have NOT been reconciled, so every entry below carries the last
// widely reported 2025 figure with `sourceStatus: "stale"`. The compliance rule
// consuming this table must degrade to `conclusive: false` — never silently
// accept a stale floor as a pass.

export type WageSourceStatus = "official" | "media-report" | "stale";

export interface UmkEntry {
  /** Province the regency/city belongs to (must match an UMP_2026 province). */
  province: string;
  /** Kabupaten/Kota name as used in `country_metadata.city`. */
  region: string;
  amount: number;
  effectiveYear: number;
  source: string;
  sourceStatus: WageSourceStatus;
  legalBasis: string;
}

const U = (
  province: string,
  region: string,
  amount: number,
  effectiveYear = 2025,
): UmkEntry => ({
  province,
  region,
  amount,
  effectiveYear,
  source: "SK Gubernur 2025 as reported by national media (superseded by pending 2026 decree)",
  sourceStatus: "stale",
  legalBasis: "PP 36/2021 jo. Permenaker 16/2024, Art. 8 (UMK)",
});

/**
 * Highest-headcount regencies/cities only. The absence of a row does NOT mean
 * "no UMK exists" — it means this pack has not reconciled one. Resolution
 * therefore falls back to the provincial UMP and flags the degradation.
 */
export const UMK_TABLE: UmkEntry[] = [
  U("Jawa Barat", "Kota Bekasi", 5_690_752),
  U("Jawa Barat", "Kabupaten Bekasi", 5_558_515),
  U("Jawa Barat", "Kabupaten Karawang", 5_599_593),
  U("Jawa Barat", "Kota Depok", 5_195_721),
  U("Jawa Barat", "Kota Bandung", 4_482_914),
  U("Jawa Barat", "Kabupaten Bogor", 4_877_211),
  U("Banten", "Kota Cilegon", 5_128_084),
  U("Banten", "Kota Tangerang", 4_992_934),
  U("Banten", "Kabupaten Tangerang", 4_901_798),
  U("Banten", "Kota Tangerang Selatan", 4_974_392),
  U("Jawa Timur", "Kota Surabaya", 4_961_753),
  U("Jawa Timur", "Kabupaten Gresik", 4_874_133),
  U("Jawa Timur", "Kabupaten Sidoarjo", 4_638_582),
  U("Jawa Tengah", "Kota Semarang", 3_454_827),
  U("Jawa Tengah", "Kabupaten Kendal", 2_899_233),
  U("DI Yogyakarta", "Kota Yogyakarta", 2_655_041),
];

export function umkConfigKey(province: string, region: string): string {
  return `id.wages.umk.${province}.${region}`;
}

export interface WageFloorResolution {
  /** Binding monthly floor in IDR. */
  amount: number;
  /** "umk" when a district figure was found, "ump" when the provincial floor applied. */
  layer: "umk" | "ump" | "fallback";
  /** Human label of the jurisdiction the floor came from. */
  jurisdiction: string;
  /** Worst source status across the resolution chain. */
  sourceStatus: WageSourceStatus;
  /** True only when the whole chain is official — drives audit conclusiveness. */
  conclusive: boolean;
  /** Ordered explanation of how the floor was reached (shown in audit output). */
  trail: string[];
}

const WORST: Record<WageSourceStatus, number> = { official: 0, "media-report": 1, stale: 2 };

function worse(a: WageSourceStatus, b: WageSourceStatus): WageSourceStatus {
  return WORST[a] >= WORST[b] ? a : b;
}

export interface ProvincialFloor {
  province: string;
  amount: number;
  sourceStatus: WageSourceStatus;
}

/**
 * Resolves the binding wage floor for an employee.
 *
 * Hierarchy: UMK (district) wins when present and higher than the UMP;
 * otherwise the UMP applies. The resulting `sourceStatus` is the WORST status
 * across every layer consulted, so a stale UMK contaminates an official UMP —
 * degradation is always visible, never silently dropped.
 */
export function resolveWageFloor(
  provincial: ProvincialFloor,
  region: string | null | undefined,
  table: UmkEntry[] = UMK_TABLE,
): WageFloorResolution {
  const trail: string[] = [
    `UMP ${provincial.province}: ${provincial.amount.toLocaleString("id-ID")} (${provincial.sourceStatus})`,
  ];

  const umk = region
    ? table.find(
        (e) =>
          e.region.toLowerCase() === region.trim().toLowerCase() &&
          e.province === provincial.province,
      )
    : undefined;

  if (!umk) {
    if (region) {
      trail.push(`No reconciled UMK for "${region}" — provincial floor applied.`);
    }
    return {
      amount: provincial.amount,
      layer: provincial.province === "Other (fallback)" ? "fallback" : "ump",
      jurisdiction: provincial.province,
      sourceStatus: provincial.sourceStatus,
      conclusive: provincial.sourceStatus === "official",
      trail,
    };
  }

  trail.push(
    `UMK ${umk.region} (${umk.effectiveYear}): ${umk.amount.toLocaleString("id-ID")} (${umk.sourceStatus})`,
  );

  const status = worse(provincial.sourceStatus, umk.sourceStatus);
  const binding = Math.max(umk.amount, provincial.amount);
  if (binding === provincial.amount && provincial.amount > umk.amount) {
    trail.push("UMP exceeds the reconciled UMK — provincial floor binds.");
  }

  return {
    amount: binding,
    layer: binding === umk.amount ? "umk" : "ump",
    jurisdiction: binding === umk.amount ? `${umk.region}, ${umk.province}` : provincial.province,
    sourceStatus: status,
    conclusive: status === "official",
    trail,
  };
}

/** True only when every UMK row is backed by a decree. Mirrors `bpjsConclusive()`. */
export function umkConclusive(table: UmkEntry[] = UMK_TABLE): boolean {
  return table.every((e) => e.sourceStatus === "official");
}
