// Philippines pack parameters (PH-2024.1). Opaque to Core; consumed only by
// this pack's engines. No external imports.

export const PH_PARAMS = {
  version: "2024.1",
  currency: "PHP",

  // BIR Withholding Tax on Compensation — Monthly (TRAIN Law, effective 2023+).
  // Each row: [upperBoundInclusive, fixedTax, rateOnExcess, floorOfBracket].
  birMonthly: [
    { upTo: 20_833, fixed: 0, rate: 0, floor: 0 },
    { upTo: 33_332, fixed: 0, rate: 0.15, floor: 20_833 },
    { upTo: 66_666, fixed: 1_875, rate: 0.20, floor: 33_333 },
    { upTo: 166_666, fixed: 8_541.80, rate: 0.25, floor: 66_667 },
    { upTo: 666_666, fixed: 33_541.80, rate: 0.30, floor: 166_667 },
    { upTo: Infinity, fixed: 183_541.80, rate: 0.35, floor: 666_667 },
  ],

  // SSS 2024 — simplified (MSC bounds + rates). Real table has step MSCs;
  // we clamp salary to the MSC range and apply combined 14% split.
  sss: {
    mscMin: 4_000,
    mscMax: 30_000,
    employeeRate: 0.045,  // 4.5%
    employerRate: 0.095,  // 9.5%
    ecMin: 10,            // Employer Compensation
    ecMax: 30,
  },

  // PhilHealth 2024 — 5% split 50/50, floor 10k, cap 100k.
  philhealth: {
    rate: 0.05,
    floor: 10_000,
    cap: 100_000,
  },

  // Pag-IBIG (HDMF) — 2% each side, capped at ₱200.
  pagibig: {
    rate: 0.02,
    cap: 200,
  },

  // Labor
  minWageNCRDaily: 610,   // NCR daily minimum wage (Wage Order NCR-24)
  workingDaysPerMonth: 22,

  // Probation / regularization (Labor Code Art. 296)
  probationMaxMonths: 6,

  // 13th month (PD 851)
  thirteenthDueMonth: 12,
  thirteenthDueDay: 24,
} as const;

export type PhParams = typeof PH_PARAMS;
