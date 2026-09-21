// Philippines pack parameters (PH-2025.1). Opaque to Core; consumed only by
// this pack's engines. No external imports.
//
// H24 — Statutory provenance is structured data, not comments. Every table
// carries a PhStatutorySource entry in `statutorySources`; the only source of
// truth for source/effectiveFrom/status is that array (see constants.ts).
import { PH_TABLES, type PhStatutorySource } from "./constants";

// SSS MSC 2025 — SSS Circular 2024-006 (SSC Res. 560-s.2024), effective
// 2025-01-01. Combined rate 15% (5% employee + 10% employer) on an MSC range
// of ₱5,000–₱35,000 in ₱500 steps. EC is employer-only: ₱10 for MSC ≤
// ₱14,500, ₱30 for MSC ≥ ₱15,000. The MSC slice above ₱20,000 funds the
// Mandatory Provident Fund (MPF / MySSS Pension Booster); this pack surfaces
// EE/ER totals only, so the MPF split is not itemized (documented in the
// evidence file). Rows are generated deterministically from the published
// schedule — employee = 5% × MSC, employer = 10% × MSC.
interface SssTableRow {
  salaryMin: number;
  salaryMax: number;
  msc: number;
  employee: number;
  employer: number;
  ec: number;
}

function buildSss2025Table(): SssTableRow[] {
  const rows: SssTableRow[] = [];
  for (let msc = 5_000; msc <= 35_000; msc += 500) {
    rows.push({
      salaryMin: msc === 5_000 ? 0 : msc - 250,
      salaryMax: msc === 35_000 ? Infinity : msc + 249.99,
      msc,
      employee: msc * 0.05,
      employer: msc * 0.1,
      ec: msc >= 15_000 ? 30 : 10,
    });
  }
  return rows;
}

const SSS_2025_TABLE: readonly SssTableRow[] = buildSss2025Table();

export const PH_PARAMS = {
  version: "2025.1", // bumped from 2024.6 — DEBT-030/031 statutory corrections (SSS Circular 2024-006 + Wage Order NCR-28)
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
    table: SSS_2025_TABLE,
    // Legacy bounds retained for quick validation and for engines that still
    // read the range. The real MSC is resolved via the table above.
    mscMin: 5_000,
    mscMax: 35_000,
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
  // regions without refactoring provenance. NCR only today. Value ₱755 is the
  // Wage Order NCR-28 non-agriculture rate (effective 2026-09-26); provenance
  // per entry. `workingDaysPerMonth` stays top-level: payroll convention
  // shared by leave/separation daily-rate math, not a regional statutory
  // value.
  wageRegions: [
    {
      region: "NCR",
      dailyMinWage: 755,
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
      source: "SSS Circular 2024-006 (SSC Res. 560-s.2024) / RA 11199 (Social Security Act of 2018)",
      effectiveFrom: "2025-01-01",
      sourceStatus: "official",
      notes:
        "15% total (5% EE / 10% ER), MSC ₱5,000–₱35,000 in ₱500 steps; EC ₱10 (MSC ≤ " +
        "₱14,500) / ₱30 (MSC ≥ ₱15,000). The MSC slice above ₱20,000 funds the MPF " +
        "(MySSS Pension Booster) — the pack surfaces EE/ER totals only. Reconciled " +
        "2026-09-21, closes DEBT-030 — evidence: legal-opinions/PH-sss-msc-2026-09-16.md.",
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
      source: "DOLE Wage Order NCR-28 (RTWPB-NCR)",
      effectiveFrom: "2026-09-26",
      sourceStatus: "official",
      notes:
        "₱755/day non-agriculture (₱718 agriculture, service/retail ≤15 workers, " +
        "manufacturing <10 workers) — single ₱60 tranche over the NCR-26 baseline. " +
        "NCR-27 (same ₱755 first tranche, 2026-07-25) is enjoined (Pasig RTC Br. 152 " +
        "TRO/injunction); NCR-28 supersedes it from 2026-09-26 — until then the " +
        "operative floor is NCR-26 ₱695. Monthly floor consumed as ₱755 × 22 = ₱16,610. " +
        "Reconciled 2026-09-21, closes DEBT-031 — evidence: legal-opinions/PH-wage-ncr-2026-09-16.md.",
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
