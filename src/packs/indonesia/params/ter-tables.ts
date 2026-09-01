// H11.1a — TER tables (PPh 21) as **pack parameters**, not engine constants.
// Loaded through the ConfigService so the engine reads them via ctx.config.
// Categories per PMK 168/2023 & PP 58/2023 (marital / dependents grouping):
//   TER A: PTKP < 54M/year  → TK/0, TK/1, K/0
//   TER B: PTKP 54M–72M     → TK/2, TK/3, K/1, K/2
//   TER C: PTKP > 72M       → K/3
//
// Each row is [upperBoundMonthlyGrossIDR, effectiveRate].
// Sub-threshold rate is 0 (see TER_ZERO).
//
// **Source status** is tracked per table. When a table is marked
// "needs-review", the conformance suite must not use golden values from it;
// classification (which category is chosen) remains testable.

export type TerCategory = "A" | "B" | "C";
export type TerSourceStatus = "official" | "needs-review";

export interface TerTable {
  category: TerCategory;
  paramsVersion: string;
  legalBasis: string;
  sourceStatus: TerSourceStatus;
  zeroThreshold: number;   // gross <= threshold ⇒ 0%
  brackets: readonly (readonly [number, number])[];
  topRate: number;         // applied above the last bracket
}

const TOP_RATE = 0.34;

/** TER A — PP 58/2023 official (well-documented in DJP examples). */
const TER_A: TerTable = {
  category: "A",
  paramsVersion: "2026.1",
  legalBasis: "PP 58/2023 lampiran A; PMK 168/2023",
  sourceStatus: "official",
  zeroThreshold: 5_400_000,
  brackets: [
    [5_650_000, 0.0025], [5_950_000, 0.005], [6_300_000, 0.0075],
    [6_750_000, 0.01], [7_500_000, 0.0125], [8_550_000, 0.015], [9_650_000, 0.0175],
    [10_050_000, 0.02], [10_350_000, 0.0225], [10_700_000, 0.025], [11_050_000, 0.03],
    [11_600_000, 0.035], [12_500_000, 0.04], [13_750_000, 0.05], [15_100_000, 0.06],
    [16_950_000, 0.07], [19_750_000, 0.08], [24_150_000, 0.09], [26_450_000, 0.1],
    [28_000_000, 0.11], [30_050_000, 0.12], [32_400_000, 0.13], [35_400_000, 0.14],
    [39_100_000, 0.15], [43_850_000, 0.16], [47_800_000, 0.17], [51_400_000, 0.18],
    [56_300_000, 0.19], [62_200_000, 0.2], [68_600_000, 0.21], [77_500_000, 0.22],
    [89_000_000, 0.23], [103_000_000, 0.24], [125_000_000, 0.25], [157_000_000, 0.26],
    [206_000_000, 0.27], [337_000_000, 0.28], [454_000_000, 0.29], [550_000_000, 0.3],
    [695_000_000, 0.31], [910_000_000, 0.32], [1_400_000_000, 0.33],
  ] as const,
  topRate: TOP_RATE,
};

/**
 * TER B — PP 58/2023 lampiran B (transcribed from the official DJP PDF:
 * pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf).
 * Applies to PTKP TK/2, TK/3, K/1, K/2.
 */
const TER_B: TerTable = {
  category: "B",
  paramsVersion: "2026.2",
  legalBasis: "PP 58/2023 lampiran B; PMK 168/2023",
  sourceStatus: "official",
  zeroThreshold: 6_200_000,
  brackets: [
    [6_500_000, 0.0025], [6_850_000, 0.005], [7_300_000, 0.0075], [9_200_000, 0.01],
    [10_750_000, 0.015], [11_250_000, 0.02], [11_600_000, 0.025], [12_600_000, 0.03],
    [13_600_000, 0.04], [14_950_000, 0.05], [16_400_000, 0.06], [18_450_000, 0.07],
    [21_850_000, 0.08], [26_000_000, 0.09], [27_700_000, 0.1], [29_350_000, 0.11],
    [31_450_000, 0.12], [33_950_000, 0.13], [37_100_000, 0.14], [41_100_000, 0.15],
    [45_800_000, 0.16], [49_500_000, 0.17], [53_800_000, 0.18], [58_500_000, 0.19],
    [64_000_000, 0.2], [71_000_000, 0.21], [80_000_000, 0.22], [93_000_000, 0.23],
    [109_000_000, 0.24], [129_000_000, 0.25], [163_000_000, 0.26], [211_000_000, 0.27],
    [374_000_000, 0.28], [459_000_000, 0.29], [555_000_000, 0.3], [704_000_000, 0.31],
    [957_000_000, 0.32], [1_405_000_000, 0.33],
  ] as const,
  topRate: TOP_RATE,
};

/** TER C — PP 58/2023 lampiran C (same primary source). Applies to K/3. */
const TER_C: TerTable = {
  category: "C",
  paramsVersion: "2026.2",
  legalBasis: "PP 58/2023 lampiran C; PMK 168/2023",
  sourceStatus: "official",
  zeroThreshold: 6_600_000,
  brackets: [
    [6_950_000, 0.0025], [7_350_000, 0.005], [7_800_000, 0.0075], [8_850_000, 0.01],
    [9_800_000, 0.0125], [10_950_000, 0.015], [11_200_000, 0.0175], [12_050_000, 0.02],
    [12_950_000, 0.03], [14_150_000, 0.04], [15_550_000, 0.05], [17_050_000, 0.06],
    [19_500_000, 0.07], [22_700_000, 0.08], [26_600_000, 0.09], [28_100_000, 0.1],
    [30_100_000, 0.11], [32_600_000, 0.12], [35_400_000, 0.13], [38_900_000, 0.14],
    [43_000_000, 0.15], [47_400_000, 0.16], [51_200_000, 0.17], [55_800_000, 0.18],
    [60_400_000, 0.19], [66_700_000, 0.2], [74_500_000, 0.21], [83_200_000, 0.22],
    [95_600_000, 0.23], [110_000_000, 0.24], [134_000_000, 0.25], [169_000_000, 0.26],
    [221_000_000, 0.27], [390_000_000, 0.28], [463_000_000, 0.29], [561_000_000, 0.3],
    [709_000_000, 0.31], [965_000_000, 0.32], [1_419_000_000, 0.33],
  ] as const,
  topRate: TOP_RATE,
};


export const TER_TABLES: Record<TerCategory, TerTable> = { A: TER_A, B: TER_B, C: TER_C };

/** Config keys used by the ConfigService. */
export const TER_CONFIG_KEYS = {
  table: (c: TerCategory) => `id.tax.terTable.${c}`,
  zero: (c: TerCategory) => `id.tax.terZero.${c}`,
} as const;
