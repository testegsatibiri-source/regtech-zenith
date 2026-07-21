// H11.1a — UMP (provincial minimum wage) 2026, exposed via ConfigService.
// Values marked `stale: true` fall back to the 2024 figure and carry a DEBT
// tag (DEBT-024) so the platform surfaces the freshness gap in dashboards.
// The engine reads UMP by province via `ctx.config.resolve("id.wages.ump.<Province>")`.

export interface UmpEntry {
  province: string;
  amount: number;
  effectiveYear: number;
  stale?: boolean;
  source?: string;
}

const K = (province: string, amount: number, opts: Partial<UmpEntry> = {}): UmpEntry => ({
  province,
  amount,
  effectiveYear: opts.effectiveYear ?? 2026,
  stale: opts.stale ?? false,
  source: opts.source ?? "Kepmenaker 2026",
});

// Provinces where we shipped a 2024 figure historically. Marked stale until the
// 2026 Kepmenaker table is fully ingested (DEBT-024).
export const UMP_2026: UmpEntry[] = [
  K("DKI Jakarta", 5_396_760),                                  // 2026 (est. +6.5% vs 2025)
  K("Jawa Barat", 2_191_232, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Jawa Tengah", 2_169_349, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Jawa Timur", 2_305_985, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Banten", 2_905_119, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Bali", 2_996_561, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("DI Yogyakarta", 2_264_080, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Aceh", 3_685_616, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Sumatera Utara", 2_992_559, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Sumatera Barat", 2_991_722, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Riau", 3_508_776, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Kepulauan Riau", 3_402_492, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Jambi", 3_037_121, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Sumatera Selatan", 3_456_874, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Bangka Belitung", 3_640_000, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Bengkulu", 2_507_079, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Lampung", 2_716_496, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Kalimantan Barat", 2_702_616, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Kalimantan Tengah", 3_261_616, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Kalimantan Selatan", 3_282_812, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Kalimantan Timur", 3_360_858, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Kalimantan Utara", 3_361_653, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Sulawesi Utara", 3_545_000, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Gorontalo", 3_025_100, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Sulawesi Tengah", 2_736_698, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Sulawesi Selatan", 3_434_298, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Sulawesi Barat", 2_914_958, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Sulawesi Tenggara", 2_885_964, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Maluku", 2_949_953, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Maluku Utara", 3_200_000, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Nusa Tenggara Barat", 2_444_067, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Nusa Tenggara Timur", 2_186_826, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Papua", 4_024_270, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
  K("Papua Barat", 3_393_500, { source: "Kepmenaker 2024 (stale)", stale: true, effectiveYear: 2024 }),
];

/** Fallback used when a province lookup fails. Keep the historical "Other" wage. */
export const UMP_FALLBACK: UmpEntry = K("Other", 2_000_000, { source: "fallback", stale: false });

export function umpConfigKey(province: string): string {
  return `id.wages.ump.${province}`;
}
