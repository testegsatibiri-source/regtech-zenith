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
 * TER B — PP 58/2023 lampiran B. Values below are the skeleton required to
 * bootstrap the pack; a per-bracket reconciliation against the official PMK
 * table is tracked as DEBT (id: ID-TER-B-RECON). The zeroThreshold + category
 * classification are correct — see conformance suite.
 */
const TER_B: TerTable = {
  category: "B",
  paramsVersion: "2026.1",
  legalBasis: "PP 58/2023 lampiran B; PMK 168/2023",
  sourceStatus: "needs-review",
  zeroThreshold: 6_200_000,
  brackets: TER_A.brackets, // provisional — engine must not treat as golden
  topRate: TOP_RATE,
};

/** TER C — same status note as TER B. */
const TER_C: TerTable = {
  category: "C",
  paramsVersion: "2026.1",
  legalBasis: "PP 58/2023 lampiran C; PMK 168/2023",
  sourceStatus: "needs-review",
  zeroThreshold: 6_600_000,
  brackets: TER_A.brackets, // provisional
  topRate: TOP_RATE,
};

export const TER_TABLES: Record<TerCategory, TerTable> = { A: TER_A, B: TER_B, C: TER_C };

/** Config keys used by the ConfigService. */
export const TER_CONFIG_KEYS = {
  table: (c: TerCategory) => `id.tax.terTable.${c}`,
  zero: (c: TerCategory) => `id.tax.terZero.${c}`,
} as const;
