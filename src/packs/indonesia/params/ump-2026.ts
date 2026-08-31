// H11.1a / H23-A0 — UMP (provincial minimum wage) 2026, exposed via ConfigService.
//
// Values below are derived from the Kemnaker announcement as reported by
// CNN Indonesia on 2026-01-11 ("Daftar Lengkap UMP 2026 di 38 Provinsi").
// They are rounded to the nearest hundred-thousand IDR as published by the
// media. The authoritative source for each province is the respective
// Gubernatorial Decree (SK Gubernur); `sourceStatus: "media-report"` marks
// this gap explicitly. A future reconciliation against the official decrees
// will flip each entry to `sourceStatus: "official"` once the exact figure is
// verified.
//
// The engine reads UMP by province via `ctx.config.resolve("id.wages.ump.<Province>")`.

export type UmpSourceStatus = "official" | "media-report" | "stale";

export interface UmpEntry {
  province: string;
  amount: number;
  effectiveYear: number;
  stale?: boolean;
  source?: string;
  sourceStatus?: UmpSourceStatus;
}

const K = (province: string, amount: number, opts: Partial<UmpEntry> = {}): UmpEntry => ({
  province,
  amount,
  effectiveYear: opts.effectiveYear ?? 2026,
  stale: opts.stale ?? false,
  source: opts.source ?? "Kepmenaker 2026",
  sourceStatus: opts.sourceStatus ?? "official",
});

// Values from CNN Indonesia reporting of the Kemnaker 2026 announcement.
// Rounded to hundred-thousand IDR as published; pending exact SK Gubernur.
export const UMP_2026: UmpEntry[] = [
  K("DKI Jakarta", 5_720_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Jawa Barat", 2_310_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Jawa Tengah", 2_320_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Jawa Timur", 2_440_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Banten", 3_100_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Bali", 3_200_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("DI Yogyakarta", 2_410_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Aceh", 3_930_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Sumatera Utara", 3_220_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Sumatera Barat", 3_180_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Riau", 3_780_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Kepulauan Riau", 3_870_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Jambi", 3_470_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Sumatera Selatan", 3_940_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Bangka Belitung", 4_030_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Bengkulu", 2_820_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Lampung", 3_040_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Kalimantan Barat", 3_050_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Kalimantan Tengah", 3_680_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Kalimantan Selatan", 3_720_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Kalimantan Timur", 3_760_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Kalimantan Utara", 3_770_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Sulawesi Utara", 4_000_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Gorontalo", 3_400_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Sulawesi Tengah", 3_170_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Sulawesi Selatan", 3_920_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Sulawesi Barat", 3_310_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Sulawesi Tenggara", 3_300_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Maluku", 3_330_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Maluku Utara", 3_510_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Nusa Tenggara Barat", 2_670_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Nusa Tenggara Timur", 2_450_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Papua", 4_430_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Papua Barat", 3_840_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Papua Selatan", 4_510_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Papua Tengah", 4_280_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Papua Pegunungan", 4_510_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
  K("Papua Barat Daya", 3_760_000, { source: "Kemnaker 2026 via CNN Indonesia (rounded)", sourceStatus: "media-report" }),
];

/** Fallback used when a province lookup fails. */
export const UMP_FALLBACK: UmpEntry = K("Other", 2_000_000, { source: "fallback", sourceStatus: "stale" });

export function umpConfigKey(province: string): string {
  return `id.wages.ump.${province}`;
}
