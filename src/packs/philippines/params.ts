// Philippines pack parameters (PH-2024.1). Opaque to Core; consumed only by
// this pack's engines. No external imports.

// SSS MSC 2024 — RA 11199 (Social Security Act of 2018) stepped table.
// Each row: salary floor (inclusive), salary ceiling (inclusive), MSC, employee
// share, employer share, EC (Employer Compensation). The combined rate is 14%
// (4.5% employee + 9.5% employer), and EC is a flat employer contribution that
// varies only with the MSC range. Source: SSS Circular 2024-004 (Contribution
// Schedule, effective 2024).
const SSS_2024_TABLE = [
  { salaryMin: 0, salaryMax: 4_249.99, msc: 4_000, employee: 180.00, employer: 380.00, ec: 10 },
  { salaryMin: 4_250, salaryMax: 4_749.99, msc: 4_500, employee: 202.50, employer: 427.50, ec: 10 },
  { salaryMin: 4_750, salaryMax: 5_249.99, msc: 5_000, employee: 225.00, employer: 475.00, ec: 10 },
  { salaryMin: 5_250, salaryMax: 5_749.99, msc: 5_500, employee: 247.50, employer: 522.50, ec: 10 },
  { salaryMin: 5_750, salaryMax: 6_249.99, msc: 6_000, employee: 270.00, employer: 570.00, ec: 10 },
  { salaryMin: 6_250, salaryMax: 6_749.99, msc: 6_500, employee: 292.50, employer: 617.50, ec: 10 },
  { salaryMin: 6_750, salaryMax: 7_249.99, msc: 7_000, employee: 315.00, employer: 665.00, ec: 10 },
  { salaryMin: 7_250, salaryMax: 7_749.99, msc: 7_500, employee: 337.50, employer: 712.50, ec: 10 },
  { salaryMin: 7_750, salaryMax: 8_249.99, msc: 8_000, employee: 360.00, employer: 760.00, ec: 10 },
  { salaryMin: 8_250, salaryMax: 8_749.99, msc: 8_500, employee: 382.50, employer: 807.50, ec: 10 },
  { salaryMin: 8_750, salaryMax: 9_249.99, msc: 9_000, employee: 405.00, employer: 855.00, ec: 10 },
  { salaryMin: 9_250, salaryMax: 9_749.99, msc: 9_500, employee: 427.50, employer: 902.50, ec: 10 },
  { salaryMin: 9_750, salaryMax: 10_249.99, msc: 10_000, employee: 450.00, employer: 950.00, ec: 10 },
  { salaryMin: 10_250, salaryMax: 10_749.99, msc: 10_500, employee: 472.50, employer: 997.50, ec: 10 },
  { salaryMin: 10_750, salaryMax: 11_249.99, msc: 11_000, employee: 495.00, employer: 1_045.00, ec: 10 },
  { salaryMin: 11_250, salaryMax: 11_749.99, msc: 11_500, employee: 517.50, employer: 1_092.50, ec: 10 },
  { salaryMin: 11_750, salaryMax: 12_249.99, msc: 12_000, employee: 540.00, employer: 1_140.00, ec: 10 },
  { salaryMin: 12_250, salaryMax: 12_749.99, msc: 12_500, employee: 562.50, employer: 1_187.50, ec: 10 },
  { salaryMin: 12_750, salaryMax: 13_249.99, msc: 13_000, employee: 585.00, employer: 1_235.00, ec: 10 },
  { salaryMin: 13_250, salaryMax: 13_749.99, msc: 13_500, employee: 607.50, employer: 1_282.50, ec: 10 },
  { salaryMin: 13_750, salaryMax: 14_249.99, msc: 14_000, employee: 630.00, employer: 1_330.00, ec: 10 },
  { salaryMin: 14_250, salaryMax: 14_749.99, msc: 14_500, employee: 652.50, employer: 1_377.50, ec: 10 },
  { salaryMin: 14_750, salaryMax: 15_249.99, msc: 15_000, employee: 675.00, employer: 1_425.00, ec: 30 },
  { salaryMin: 15_250, salaryMax: 15_749.99, msc: 15_500, employee: 697.50, employer: 1_472.50, ec: 30 },
  { salaryMin: 15_750, salaryMax: 16_249.99, msc: 16_000, employee: 720.00, employer: 1_520.00, ec: 30 },
  { salaryMin: 16_250, salaryMax: 16_749.99, msc: 16_500, employee: 742.50, employer: 1_567.50, ec: 30 },
  { salaryMin: 16_750, salaryMax: 17_249.99, msc: 17_000, employee: 765.00, employer: 1_615.00, ec: 30 },
  { salaryMin: 17_250, salaryMax: 17_749.99, msc: 17_500, employee: 787.50, employer: 1_662.50, ec: 30 },
  { salaryMin: 17_750, salaryMax: 18_249.99, msc: 18_000, employee: 810.00, employer: 1_710.00, ec: 30 },
  { salaryMin: 18_250, salaryMax: 18_749.99, msc: 18_500, employee: 832.50, employer: 1_757.50, ec: 30 },
  { salaryMin: 18_750, salaryMax: 19_249.99, msc: 19_000, employee: 855.00, employer: 1_805.00, ec: 30 },
  { salaryMin: 19_250, salaryMax: 19_749.99, msc: 19_500, employee: 877.50, employer: 1_852.50, ec: 30 },
  { salaryMin: 19_750, salaryMax: 20_249.99, msc: 20_000, employee: 900.00, employer: 1_900.00, ec: 30 },
  { salaryMin: 20_250, salaryMax: 20_749.99, msc: 20_500, employee: 922.50, employer: 1_947.50, ec: 30 },
  { salaryMin: 20_750, salaryMax: 21_249.99, msc: 21_000, employee: 945.00, employer: 1_995.00, ec: 30 },
  { salaryMin: 21_250, salaryMax: 21_749.99, msc: 21_500, employee: 967.50, employer: 2_042.50, ec: 30 },
  { salaryMin: 21_750, salaryMax: 22_249.99, msc: 22_000, employee: 990.00, employer: 2_090.00, ec: 30 },
  { salaryMin: 22_250, salaryMax: 22_749.99, msc: 22_500, employee: 1_012.50, employer: 2_137.50, ec: 30 },
  { salaryMin: 22_750, salaryMax: 23_249.99, msc: 23_000, employee: 1_035.00, employer: 2_185.00, ec: 30 },
  { salaryMin: 23_250, salaryMax: 23_749.99, msc: 23_500, employee: 1_057.50, employer: 2_232.50, ec: 30 },
  { salaryMin: 23_750, salaryMax: 24_249.99, msc: 24_000, employee: 1_080.00, employer: 2_280.00, ec: 30 },
  { salaryMin: 24_250, salaryMax: 24_749.99, msc: 24_500, employee: 1_102.50, employer: 2_327.50, ec: 30 },
  { salaryMin: 24_750, salaryMax: 25_249.99, msc: 25_000, employee: 1_125.00, employer: 2_375.00, ec: 30 },
  { salaryMin: 25_250, salaryMax: 25_749.99, msc: 25_500, employee: 1_147.50, employer: 2_422.50, ec: 30 },
  { salaryMin: 25_750, salaryMax: 26_249.99, msc: 26_000, employee: 1_170.00, employer: 2_470.00, ec: 30 },
  { salaryMin: 26_250, salaryMax: 26_749.99, msc: 26_500, employee: 1_192.50, employer: 2_517.50, ec: 30 },
  { salaryMin: 26_750, salaryMax: 27_249.99, msc: 27_000, employee: 1_215.00, employer: 2_565.00, ec: 30 },
  { salaryMin: 27_250, salaryMax: 27_749.99, msc: 27_500, employee: 1_237.50, employer: 2_612.50, ec: 30 },
  { salaryMin: 27_750, salaryMax: 28_249.99, msc: 28_000, employee: 1_260.00, employer: 2_660.00, ec: 30 },
  { salaryMin: 28_250, salaryMax: 28_749.99, msc: 28_500, employee: 1_282.50, employer: 2_707.50, ec: 30 },
  { salaryMin: 28_750, salaryMax: 29_249.99, msc: 29_000, employee: 1_305.00, employer: 2_755.00, ec: 30 },
  { salaryMin: 29_250, salaryMax: 29_749.99, msc: 29_500, employee: 1_327.50, employer: 2_802.50, ec: 30 },
  { salaryMin: 29_750, salaryMax: Infinity, msc: 30_000, employee: 1_350.00, employer: 2_850.00, ec: 30 },
] as const;

export const PH_PARAMS = {
  version: "2024.2", // bumped from 2024.1 after SSS stepped table + 13th base
  currency: "PHP",

  // BIR Withholding Tax on Compensation — Monthly (TRAIN Law, effective 2023+).
  // Each row: [upperBoundInclusive, fixedTax, rateOnExcess, floorOfBracket].
  // Source: Republic Act No. 10963 (TRAIN Law) / RR 11-2018.
  birMonthly: [
    { upTo: 20_833, fixed: 0, rate: 0, floor: 0 },
    { upTo: 33_332, fixed: 0, rate: 0.15, floor: 20_833 },
    { upTo: 66_666, fixed: 1_875, rate: 0.20, floor: 33_333 },
    { upTo: 166_666, fixed: 8_541.80, rate: 0.25, floor: 66_667 },
    { upTo: 666_666, fixed: 33_541.80, rate: 0.30, floor: 166_667 },
    { upTo: Infinity, fixed: 183_541.80, rate: 0.35, floor: 666_667 },
  ],

  // BIR 13th-month / benefit exemption ceiling (annual).
  // Source: RR 11-2018, Sec. 2.79.1(B)(a): first ₱90,000 of 13th month pay,
  // Christmas bonuses, productivity incentives, loyalty awards, gifts and other
  // benefits of a similar nature are exempt.
  birExemptBenefitsCeiling: 90_000,

  // SSS 2024 — RA 11199 stepped table.
  sss: {
    table: SSS_2024_TABLE,
    // Legacy bounds retained for quick validation and for engines that still
    // read the range. The real MSC is resolved via the table above.
    mscMin: 4_000,
    mscMax: 30_000,
  },

  // PhilHealth 2024 — 5% split 50/50, floor 10k, cap 100k.
  // Source: PhilHealth Circular 2023-0027.
  philhealth: {
    rate: 0.05,
    floor: 10_000,
    cap: 100_000,
  },

  // Pag-IBIG (HDMF) — 2% each side, capped at ₱200.
  // Source: HDMF Contribution Schedule 2024.
  pagibig: {
    rate: 0.02,
    cap: 200,
  },

  // Labor — NCR only today. Region-aware lookup planned (P1d).
  // Source: DOLE Wage Order NCR-24.
  regions: {
    NCR: { dailyMinWage: 610, workingDaysPerMonth: 22 },
  },
  minWageNCRDaily: 610,   // deprecated: use regions.NCR.dailyMinWage
  workingDaysPerMonth: 22,

  // Probation / regularization (Labor Code Art. 296)
  probationMaxMonths: 6,

  // 13th month (PD 851)
  thirteenthDueMonth: 12,
  thirteenthDueDay: 24,
  // Statutory base: total basic + overtime + night differential earned in the
  // calendar year, divided by 12. When the payroll system cannot yet provide
  // the annual earned amount, the engine may fall back to current monthly salary
  // with a warning flag.
  thirteenthEarnedBaseEnabled: true,
} as const;

export type PhParams = typeof PH_PARAMS;
