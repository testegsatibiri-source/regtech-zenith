// Philippines pack parameters (PH-2024.1). Opaque to Core; consumed only by
// this pack's engines. No external imports.
//
// H24 — Statutory provenance is structured data, not comments. Every table
// carries a PhStatutorySource entry in `statutorySources`; the only source of
// truth for source/effectiveFrom/status is that array (see constants.ts).
import { PH_TABLES, type PhStatutorySource } from "./constants";

// SSS MSC 2024 — RA 11199 stepped table.
// Each row: salary floor (inclusive), salary ceiling (inclusive), MSC, employee
// share, employer share, EC (Employer Compensation). The combined rate is 14%
// (4.5% employee + 9.5% employer), and EC is a flat employer contribution that
// varies only with the MSC range.
// NOTE (H24): superseded effective 2025-01-01 by SSS Circular 2024-006
// (15%: 5% EE + 10% ER, MSC ₱5,000–₱35,000 with MPF). Values intentionally
// unchanged in H24 — see DEBT-030. Provenance in `statutorySources`.
const SSS_2024_TABLE = [
  { salaryMin: 0, salaryMax: 4_249.99, msc: 4_000, employee: 180.0, employer: 380.0, ec: 10 },
  { salaryMin: 4_250, salaryMax: 4_749.99, msc: 4_500, employee: 202.5, employer: 427.5, ec: 10 },
  { salaryMin: 4_750, salaryMax: 5_249.99, msc: 5_000, employee: 225.0, employer: 475.0, ec: 10 },
  { salaryMin: 5_250, salaryMax: 5_749.99, msc: 5_500, employee: 247.5, employer: 522.5, ec: 10 },
  { salaryMin: 5_750, salaryMax: 6_249.99, msc: 6_000, employee: 270.0, employer: 570.0, ec: 10 },
  { salaryMin: 6_250, salaryMax: 6_749.99, msc: 6_500, employee: 292.5, employer: 617.5, ec: 10 },
  { salaryMin: 6_750, salaryMax: 7_249.99, msc: 7_000, employee: 315.0, employer: 665.0, ec: 10 },
  { salaryMin: 7_250, salaryMax: 7_749.99, msc: 7_500, employee: 337.5, employer: 712.5, ec: 10 },
  { salaryMin: 7_750, salaryMax: 8_249.99, msc: 8_000, employee: 360.0, employer: 760.0, ec: 10 },
  { salaryMin: 8_250, salaryMax: 8_749.99, msc: 8_500, employee: 382.5, employer: 807.5, ec: 10 },
  { salaryMin: 8_750, salaryMax: 9_249.99, msc: 9_000, employee: 405.0, employer: 855.0, ec: 10 },
  { salaryMin: 9_250, salaryMax: 9_749.99, msc: 9_500, employee: 427.5, employer: 902.5, ec: 10 },
  { salaryMin: 9_750, salaryMax: 10_249.99, msc: 10_000, employee: 450.0, employer: 950.0, ec: 10 },
  {
    salaryMin: 10_250,
    salaryMax: 10_749.99,
    msc: 10_500,
    employee: 472.5,
    employer: 997.5,
    ec: 10,
  },
  {
    salaryMin: 10_750,
    salaryMax: 11_249.99,
    msc: 11_000,
    employee: 495.0,
    employer: 1_045.0,
    ec: 10,
  },
  {
    salaryMin: 11_250,
    salaryMax: 11_749.99,
    msc: 11_500,
    employee: 517.5,
    employer: 1_092.5,
    ec: 10,
  },
  {
    salaryMin: 11_750,
    salaryMax: 12_249.99,
    msc: 12_000,
    employee: 540.0,
    employer: 1_140.0,
    ec: 10,
  },
  {
    salaryMin: 12_250,
    salaryMax: 12_749.99,
    msc: 12_500,
    employee: 562.5,
    employer: 1_187.5,
    ec: 10,
  },
  {
    salaryMin: 12_750,
    salaryMax: 13_249.99,
    msc: 13_000,
    employee: 585.0,
    employer: 1_235.0,
    ec: 10,
  },
  {
    salaryMin: 13_250,
    salaryMax: 13_749.99,
    msc: 13_500,
    employee: 607.5,
    employer: 1_282.5,
    ec: 10,
  },
  {
    salaryMin: 13_750,
    salaryMax: 14_249.99,
    msc: 14_000,
    employee: 630.0,
    employer: 1_330.0,
    ec: 10,
  },
  {
    salaryMin: 14_250,
    salaryMax: 14_749.99,
    msc: 14_500,
    employee: 652.5,
    employer: 1_377.5,
    ec: 10,
  },
  {
    salaryMin: 14_750,
    salaryMax: 15_249.99,
    msc: 15_000,
    employee: 675.0,
    employer: 1_425.0,
    ec: 30,
  },
  {
    salaryMin: 15_250,
    salaryMax: 15_749.99,
    msc: 15_500,
    employee: 697.5,
    employer: 1_472.5,
    ec: 30,
  },
  {
    salaryMin: 15_750,
    salaryMax: 16_249.99,
    msc: 16_000,
    employee: 720.0,
    employer: 1_520.0,
    ec: 30,
  },
  {
    salaryMin: 16_250,
    salaryMax: 16_749.99,
    msc: 16_500,
    employee: 742.5,
    employer: 1_567.5,
    ec: 30,
  },
  {
    salaryMin: 16_750,
    salaryMax: 17_249.99,
    msc: 17_000,
    employee: 765.0,
    employer: 1_615.0,
    ec: 30,
  },
  {
    salaryMin: 17_250,
    salaryMax: 17_749.99,
    msc: 17_500,
    employee: 787.5,
    employer: 1_662.5,
    ec: 30,
  },
  {
    salaryMin: 17_750,
    salaryMax: 18_249.99,
    msc: 18_000,
    employee: 810.0,
    employer: 1_710.0,
    ec: 30,
  },
  {
    salaryMin: 18_250,
    salaryMax: 18_749.99,
    msc: 18_500,
    employee: 832.5,
    employer: 1_757.5,
    ec: 30,
  },
  {
    salaryMin: 18_750,
    salaryMax: 19_249.99,
    msc: 19_000,
    employee: 855.0,
    employer: 1_805.0,
    ec: 30,
  },
  {
    salaryMin: 19_250,
    salaryMax: 19_749.99,
    msc: 19_500,
    employee: 877.5,
    employer: 1_852.5,
    ec: 30,
  },
  {
    salaryMin: 19_750,
    salaryMax: 20_249.99,
    msc: 20_000,
    employee: 900.0,
    employer: 1_900.0,
    ec: 30,
  },
  {
    salaryMin: 20_250,
    salaryMax: 20_749.99,
    msc: 20_500,
    employee: 922.5,
    employer: 1_947.5,
    ec: 30,
  },
  {
    salaryMin: 20_750,
    salaryMax: 21_249.99,
    msc: 21_000,
    employee: 945.0,
    employer: 1_995.0,
    ec: 30,
  },
  {
    salaryMin: 21_250,
    salaryMax: 21_749.99,
    msc: 21_500,
    employee: 967.5,
    employer: 2_042.5,
    ec: 30,
  },
  {
    salaryMin: 21_750,
    salaryMax: 22_249.99,
    msc: 22_000,
    employee: 990.0,
    employer: 2_090.0,
    ec: 30,
  },
  {
    salaryMin: 22_250,
    salaryMax: 22_749.99,
    msc: 22_500,
    employee: 1_012.5,
    employer: 2_137.5,
    ec: 30,
  },
  {
    salaryMin: 22_750,
    salaryMax: 23_249.99,
    msc: 23_000,
    employee: 1_035.0,
    employer: 2_185.0,
    ec: 30,
  },
  {
    salaryMin: 23_250,
    salaryMax: 23_749.99,
    msc: 23_500,
    employee: 1_057.5,
    employer: 2_232.5,
    ec: 30,
  },
  {
    salaryMin: 23_750,
    salaryMax: 24_249.99,
    msc: 24_000,
    employee: 1_080.0,
    employer: 2_280.0,
    ec: 30,
  },
  {
    salaryMin: 24_250,
    salaryMax: 24_749.99,
    msc: 24_500,
    employee: 1_102.5,
    employer: 2_327.5,
    ec: 30,
  },
  {
    salaryMin: 24_750,
    salaryMax: 25_249.99,
    msc: 25_000,
    employee: 1_125.0,
    employer: 2_375.0,
    ec: 30,
  },
  {
    salaryMin: 25_250,
    salaryMax: 25_749.99,
    msc: 25_500,
    employee: 1_147.5,
    employer: 2_422.5,
    ec: 30,
  },
  {
    salaryMin: 25_750,
    salaryMax: 26_249.99,
    msc: 26_000,
    employee: 1_170.0,
    employer: 2_470.0,
    ec: 30,
  },
  {
    salaryMin: 26_250,
    salaryMax: 26_749.99,
    msc: 26_500,
    employee: 1_192.5,
    employer: 2_517.5,
    ec: 30,
  },
  {
    salaryMin: 26_750,
    salaryMax: 27_249.99,
    msc: 27_000,
    employee: 1_215.0,
    employer: 2_565.0,
    ec: 30,
  },
  {
    salaryMin: 27_250,
    salaryMax: 27_749.99,
    msc: 27_500,
    employee: 1_237.5,
    employer: 2_612.5,
    ec: 30,
  },
  {
    salaryMin: 27_750,
    salaryMax: 28_249.99,
    msc: 28_000,
    employee: 1_260.0,
    employer: 2_660.0,
    ec: 30,
  },
  {
    salaryMin: 28_250,
    salaryMax: 28_749.99,
    msc: 28_500,
    employee: 1_282.5,
    employer: 2_707.5,
    ec: 30,
  },
  {
    salaryMin: 28_750,
    salaryMax: 29_249.99,
    msc: 29_000,
    employee: 1_305.0,
    employer: 2_755.0,
    ec: 30,
  },
  {
    salaryMin: 29_250,
    salaryMax: 29_749.99,
    msc: 29_500,
    employee: 1_327.5,
    employer: 2_802.5,
    ec: 30,
  },
  {
    salaryMin: 29_750,
    salaryMax: Infinity,
    msc: 30_000,
    employee: 1_350.0,
    employer: 2_850.0,
    ec: 30,
  },
] as const;

export const PH_PARAMS = {
  version: "2024.6", // bumped from 2024.5 after H22 Fase C Solo Parent ID validation
  currency: "PHP",

  // BIR Withholding Tax on Compensation — Monthly (TRAIN Law).
  // Each row: [upperBoundInclusive, fixedTax, rateOnExcess, floorOfBracket].
  // Provenance: PH_BIR_MONTHLY in `statutorySources`.
  birMonthly: [
    { upTo: 20_833, fixed: 0, rate: 0, floor: 0 },
    { upTo: 33_332, fixed: 0, rate: 0.15, floor: 20_833 },
    { upTo: 66_666, fixed: 1_875, rate: 0.2, floor: 33_333 },
    { upTo: 166_666, fixed: 8_541.8, rate: 0.25, floor: 66_667 },
    { upTo: 666_666, fixed: 33_541.8, rate: 0.3, floor: 166_667 },
    { upTo: Infinity, fixed: 183_541.8, rate: 0.35, floor: 666_667 },
  ],

  // BIR 13th-month / benefit exemption ceiling (annual). The first ₱90,000 of
  // 13th month pay, Christmas bonuses, productivity incentives, loyalty
  // awards, gifts and similar benefits are exempt. Same provenance as
  // PH_BIR_MONTHLY (RR 11-2018, Sec. 2.79.1(B)(a)).
  birExemptBenefitsCeiling: 90_000,

  // SSS stepped table (provenance: PH_SSS_MSC).
  sss: {
    table: SSS_2024_TABLE,
    // Legacy bounds retained for quick validation and for engines that still
    // read the range. The real MSC is resolved via the table above.
    mscMin: 4_000,
    mscMax: 30_000,
  },

  // PhilHealth premium (provenance: PH_PHILHEALTH).
  philhealth: {
    rate: 0.05,
    floor: 10_000,
    cap: 100_000,
  },

  // Pag-IBIG / HDMF (provenance: PH_PAGIBIG).
  pagibig: {
    rate: 0.02,
    cap: 200,
  },

  // Regional minimum wages — array-shaped from the start (H24) so B4 can add
  // regions without refactoring provenance. NCR only today. Value ₱610 is
  // the Wage Order NCR-23 rate and is STALE (see DEBT-031); provenance per
  // entry. `workingDaysPerMonth` stays top-level: payroll convention shared
  // by leave/separation daily-rate math, not a regional statutory value.
  wageRegions: [
    {
      region: "NCR",
      dailyMinWage: 610,
      workingDaysPerMonth: 22,
    },
  ] as const,
  workingDaysPerMonth: 22,

  // Probation / regularization (Labor Code Art. 296)
  probationMaxMonths: 6,

  // Offboarding / final pay (Labor Code Arts. 297–299; DOLE LA 06-20).
  separation: {
    finalPayDeadlineDays: 30, // DOLE Labor Advisory 06-20
    coeDeadlineDays: 3, // Art. 102 — 3 days of request
    nteResponseDays: 5, // minimum calendar days to answer NTE
    doleAdvanceNoticeDays: 30, // authorized-cause advance notice
    resignationNoticeDays: 30, // Art. 285 minimum notice
  },

  // Statutory leave (H22 Fase B).
  // Art. 95 (SIL), RA 11210 (maternity), RA 8187 (paternity),
  // RA 8972/RA 11861 (solo parent), RA 9262 (VAWC), RA 9710 (gynecological).
  leave: {
    silDays: 5,
    maternityDays: 105,
    maternitySoloParentDays: 120,
    maternityMiscarriageDays: 60,
    maternityTransferableDays: 7,
    // RA 11210 IRR uses a 30-day month for the daily maternity rate.
    maternityDailyDivisor: 30,
    paternityDays: 7,
    paternityMaxChildren: 4,
    soloParentDays: 7,
    vawcDays: 10,
    gynecologicalDays: 60, // up to 2 months per 12-month period
  },

  // 13th month (PD 851)
  thirteenthDueMonth: 12,
  thirteenthDueDay: 24,
  // Statutory base: total basic + overtime + night differential earned in the
  // calendar year, divided by 12. When the payroll system cannot yet provide
  // the annual earned amount, the engine may fall back to current monthly salary
  // with a warning flag.
  thirteenthEarnedBaseEnabled: true,

  // H24 — single source of truth for statutory provenance.
  // Rule: "official" is a CONSEQUENCE of an evidence file existing in
  // docs/governance/legal-opinions/ (enforced by params-validity.test.ts).
  statutorySources: [
    {
      table: PH_TABLES.SSS_MSC,
      source: "SSS Circular 2024-004 / RA 11199 (Social Security Act of 2018)",
      effectiveFrom: "2024-01-01",
      sourceStatus: "stale",
      notes:
        "Superseded effective 2025-01-01 by SSS Circular 2024-006 (SSC Res. 560-s.2024): " +
        "15% total (5% EE / 10% ER), MSC ₱5,000–₱35,000 with Mandatory Provident Fund. " +
        "Value correction requires params/rulesetVersion bump + re-signature — DEBT-030.",
    },
    {
      table: PH_TABLES.PHILHEALTH,
      source: "PhilHealth Circular 2023-0027 / RA 11223 (Universal Health Care Act)",
      effectiveFrom: "2024-01-01",
      sourceStatus: "official",
      notes:
        "5% is the final scheduled UHC rate; floor ₱10,000 / ceiling ₱100,000, 50/50 split. " +
        "Confirmed unchanged for 2026 — evidence: legal-opinions/PH-philhealth-2026-09-16.md.",
    },
    {
      table: PH_TABLES.BIR_MONTHLY,
      source: "RA 10963 (TRAIN Law) / RR 11-2018, Annex E",
      effectiveFrom: "2023-01-01",
      sourceStatus: "official",
      notes:
        "Monthly withholding table + ₱90,000 annual exemption (RR 11-2018 Sec. 2.79.1(B)(a)). " +
        "Current schedule since 2023-01-01, unchanged in 2026 — evidence: legal-opinions/PH-bir-withholding-2026-09-16.md.",
    },
    {
      table: PH_TABLES.WAGE_REGIONS,
      source: "DOLE Wage Order NCR-23 (RTWPB-NCR)",
      effectiveFrom: "2023-07-16",
      sourceStatus: "stale",
      notes:
        "₱610/day is the NCR-23 rate. NCR-24 (₱645, 2024-07-17), NCR-26 (₱695, 2025-07-18) and " +
        "NCR-27 (₱755, 2026-07-25; NCR-28 pending publication effectivity) have since superseded it. " +
        "The pre-H24 comment cited 'NCR-24' for a value that is in fact the NCR-23 rate. " +
        "Value correction requires params/rulesetVersion bump + re-signature — DEBT-031.",
    },
    {
      table: PH_TABLES.PAGIBIG,
      source: "HDMF Circular No. 460 / RA 9679",
      effectiveFrom: "2024-02-01",
      sourceStatus: "official",
      notes:
        "2%/2% on a Maximum Fund Salary of ₱10,000 (₱200 cap per side); 1% EE tier at or below " +
        "₱1,500 (outside formal payroll scope). Unchanged in 2026 — evidence: legal-opinions/PH-pagibig-2026-09-16.md.",
    },
  ] satisfies readonly PhStatutorySource[],
} as const;

/** Monthly minimum-wage floor for a region (default NCR). Single reader for
 *  PH-DOLE-MINWAGE / PH-WO-NCR-MINWAGE — H24 array-shaped wage regions. */
export function phMinWageMonthlyFloor(region = "NCR"): number {
  const entry =
    PH_PARAMS.wageRegions.find((r) => r.region === region) ?? PH_PARAMS.wageRegions[0];
  return entry.dailyMinWage * entry.workingDaysPerMonth;
}

export type PhParams = typeof PH_PARAMS;
