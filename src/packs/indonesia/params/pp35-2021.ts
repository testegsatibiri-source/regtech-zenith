// H23-C — Indonesian separation ruleset (pesangon / UPMK / UPH / PKWT).
//
// Baseline normativo tri-instrumento (plano aprovado, Fase C):
//   • PP 35/2021          — tabelas e composição de direitos (arts. 15–17, 36–56)
//   • UU 6/2023           — estatui o Cipta Kerja; art. 156 (base salarial art. 157)
//   • MK 168/PUU-XXI/2023 — 31/10/2024: art. 156(2) lido como *paling sedikit*
//                           (piso, não valor fechado) + prazo de transição
//                           legislativa até 31/10/2026.
//
// Consequência de arquitetura: o motor devolve `statutoryMinimum` — NUNCA um
// "valor final legal". Acordos individuais/coletivos podem elevar o valor e
// entram como `contractualEntitlement`, fora do baseline.
//
// Gates normativos:
//   • Futuro: terminationDate >= blockingFrom ("2026-10-31") exige ruleset
//     sucessor validado; sem ele, BLOCKED_PENDING_REGULATORY_REVALIDATION.
//   • Histórico: terminationDate < effectiveFrom ("2024-10-31") exige ruleset
//     histórico certificado; sem ele, BLOCKED_MISSING_HISTORICAL_RULESET.
//   Nenhum ruleset calcula fora da sua janela de autoridade normativa.
//
// O componente de 15% (perumahan/pengobatan/perawatan, antigo art. 156(4))
// foi removido do baseline pela UU 6/2023 e NÃO existe como flag do pacote
// (item LEGAL-VALIDATION no parecer).

export interface LegalInstrument {
  instrument: "PP 35/2021" | "UU 6/2023" | "UU 13/2003" | "MK 168/PUU-XXI/2023" | "Permenaker 6/2016";
  articles?: string[];
  decisionDate?: string;
  effect?: string;
}

export interface SeparationRulesetMeta {
  ruleVersion: string;
  effectiveFrom: string;
  regulatoryReviewRequiredBy: string;
  regulatoryStatus: {
    status: "time_bounded";
    blockingFrom: string;
    reason: string;
  };
  legalBasis: LegalInstrument[];
  sourceStatus: "official";
}

export const ID_SEPARATION_RULESET: SeparationRulesetMeta = {
  ruleVersion: "ID-SEPARATION-2026.1",
  effectiveFrom: "2024-10-31", // MK 168/PUU-XXI/2023 decision date
  regulatoryReviewRequiredBy: "2026-10-31",
  regulatoryStatus: {
    status: "time_bounded",
    blockingFrom: "2026-10-31",
    reason: "MK 168/PUU-XXI/2023 legislative transition deadline",
  },
  legalBasis: [
    { instrument: "PP 35/2021", articles: ["15", "16", "17", "36", "40", "41", "42", "43", "44", "45", "46", "48", "50", "51", "52", "55", "56"] },
    { instrument: "UU 6/2023", articles: ["156", "157"] },
    {
      instrument: "MK 168/PUU-XXI/2023",
      decisionDate: "2024-10-31",
      effect: "art. 156(2) UU 13/2003 read as statutory minimum (paling sedikit)",
    },
  ],
  sourceStatus: "official",
};

// ---- Pesangon bands (PP 35/2021 art. 40(2), floor-based — NO rounding) ----
// "masa kerja kurang dari 1 tahun" = 1 bulan; "1 tahun atau lebih tetapi
// kurang dari 2 tahun" = 2 bulan; …; "8 tahun atau lebih" = 9 bulan.
export interface ServiceBand {
  minMonths: number;
  monthsWage: number;
  label: string;
}

export const PESANGON_BANDS: ServiceBand[] = [
  { minMonths: 0, monthsWage: 1, label: "< 1 tahun" },
  { minMonths: 12, monthsWage: 2, label: "1–<2 tahun" },
  { minMonths: 24, monthsWage: 3, label: "2–<3 tahun" },
  { minMonths: 36, monthsWage: 4, label: "3–<4 tahun" },
  { minMonths: 48, monthsWage: 5, label: "4–<5 tahun" },
  { minMonths: 60, monthsWage: 6, label: "5–<6 tahun" },
  { minMonths: 72, monthsWage: 7, label: "6–<7 tahun" },
  { minMonths: 84, monthsWage: 8, label: "7–<8 tahun" },
  { minMonths: 96, monthsWage: 9, label: "≥ 8 tahun" },
];

// ---- UPMK bands (PP 35/2021 art. 40(3), floor-based) ----
export const UPMK_BANDS: ServiceBand[] = [
  { minMonths: 36, monthsWage: 2, label: "3–<6 tahun" },
  { minMonths: 72, monthsWage: 3, label: "6–<9 tahun" },
  { minMonths: 108, monthsWage: 4, label: "9–<12 tahun" },
  { minMonths: 144, monthsWage: 5, label: "12–<15 tahun" },
  { minMonths: 180, monthsWage: 6, label: "15–<18 tahun" },
  { minMonths: 216, monthsWage: 7, label: "18–<21 tahun" },
  { minMonths: 252, monthsWage: 8, label: "21–<24 tahun" },
  { minMonths: 288, monthsWage: 9, label: "≥ 24 tahun" },
];

export function bandForMonths(bands: ServiceBand[], completedMonths: number): ServiceBand | null {
  let hit: ServiceBand | null = null;
  for (const b of bands) {
    if (completedMonths >= b.minMonths) hit = b;
  }
  return hit;
}

// ---- Entitlement matrix por motivo (PP 35/2021 arts. 36–56) ----
// Cada motivo é uma composição de direitos — não um multiplicador único.
export interface SeparationEntitlement {
  pesangon?: { applicable: boolean; multiplier?: number };
  upmk?: { applicable: boolean; multiplier?: number };
  uph: { applicable: boolean };
  uangPisah?: {
    applicable: boolean;
    source: "employment_agreement" | "company_regulation" | "cba";
  };
  /** PKWT only: end-of-contract compensation (art. 15) / early termination (art. 17). */
  pkwtCompensation?: { applicable: boolean };
  remainingTermWages?: { applicable: boolean };
}

export interface SeparationReason {
  code: string;
  title: string;
  titleId: string;
  category: "employer_initiative" | "employee_initiative" | "natural" | "contract_end";
  articles: string[];
  entitlement: SeparationEntitlement;
  legalBasis: LegalInstrument[];
}

const B = (articles: string[]): LegalInstrument[] => [
  { instrument: "PP 35/2021", articles },
  { instrument: "UU 6/2023", articles: ["156"] },
  {
    instrument: "MK 168/PUU-XXI/2023",
    decisionDate: "2024-10-31",
    effect: "amounts below are statutory minima (paling sedikit)",
  },
];

const full = (pesangonMult: number, upmkMult: number): SeparationEntitlement => ({
  pesangon: { applicable: true, multiplier: pesangonMult },
  upmk: { applicable: true, multiplier: upmkMult },
  uph: { applicable: true },
});

const uphPlusPisah = (): SeparationEntitlement => ({
  uph: { applicable: true },
  uangPisah: { applicable: true, source: "company_regulation" },
});

export const ID_SEPARATION_REASONS: SeparationReason[] = [
  {
    code: "MERGER_WORKER_REFUSES",
    title: "Merger/consolidation/spin-off — worker unwilling to continue",
    titleId: "Penggabungan/peleburan/pemisahan — pekerja tidak bersedia",
    category: "employer_initiative",
    articles: ["41(1)"],
    entitlement: full(1, 1),
    legalBasis: B(["41"]),
  },
  {
    code: "MERGER_EMPLOYER_REFUSES",
    title: "Merger/consolidation/spin-off — employer unwilling to retain",
    titleId: "Penggabungan/peleburan/pemisahan — pengusaha tidak bersedia",
    category: "employer_initiative",
    articles: ["41(2)"],
    entitlement: full(0.5, 1),
    legalBasis: B(["41"]),
  },
  {
    code: "ACQUISITION_WORKER_REFUSES",
    title: "Acquisition — worker unwilling to continue",
    titleId: "Pengambilalihan — pekerja tidak bersedia",
    category: "employer_initiative",
    articles: ["42(1)"],
    entitlement: full(1, 1),
    legalBasis: B(["42"]),
  },
  {
    code: "ACQUISITION_EMPLOYER_TERMINATES",
    title: "Acquisition — employer terminates",
    titleId: "Pengambilalihan — pengusaha melakukan PHK",
    category: "employer_initiative",
    articles: ["42(2)"],
    entitlement: full(0.5, 1),
    legalBasis: B(["42"]),
  },
  {
    code: "EFFICIENCY_LOSSES",
    title: "Efficiency because the company suffers losses",
    titleId: "Efisiensi karena perusahaan mengalami kerugian",
    category: "employer_initiative",
    articles: ["43(1)"],
    entitlement: full(1, 1),
    legalBasis: B(["43"]),
  },
  {
    code: "EFFICIENCY",
    title: "Efficiency to prevent losses",
    titleId: "Efisiensi untuk mencegah kerugian",
    category: "employer_initiative",
    articles: ["43(2)"],
    entitlement: full(0.5, 1),
    legalBasis: B(["43"]),
  },
  {
    code: "CLOSURE_LOSSES",
    title: "Company closure due to losses",
    titleId: "Perusahaan tutup karena rugi",
    category: "employer_initiative",
    articles: ["44(1)"],
    entitlement: full(0.5, 1),
    legalBasis: B(["44"]),
  },
  {
    code: "CLOSURE_NO_LOSSES",
    title: "Company closure not due to losses",
    titleId: "Perusahaan tutup bukan karena rugi",
    category: "employer_initiative",
    articles: ["44(2)"],
    entitlement: full(1, 1),
    legalBasis: B(["44"]),
  },
  {
    code: "FORCE_MAJEURE_CLOSING",
    title: "Force majeure — company closes",
    titleId: "Keadaan memaksa — perusahaan tutup",
    category: "employer_initiative",
    articles: ["45(1)"],
    entitlement: full(0.5, 1),
    legalBasis: B(["45"]),
  },
  {
    code: "FORCE_MAJEURE",
    title: "Force majeure — company does not close",
    titleId: "Keadaan memaksa — perusahaan tidak tutup",
    category: "employer_initiative",
    articles: ["45(2)"],
    entitlement: full(0.75, 1),
    legalBasis: B(["45"]),
  },
  {
    code: "BANKRUPTCY",
    title: "Bankruptcy (pailit)",
    titleId: "Perusahaan pailit",
    category: "employer_initiative",
    articles: ["46"],
    entitlement: full(0.5, 1),
    legalBasis: B(["46"]),
  },
  {
    code: "DETAINED_UNABLE_TO_WORK",
    title: "Worker detained >6 months, unable to work (no company loss)",
    titleId: "Pekerja ditahan >6 bulan, tidak dapat bekerja",
    category: "natural",
    articles: ["48"],
    entitlement: full(1, 1),
    legalBasis: B(["48"]),
  },
  {
    code: "DEATH",
    title: "Death of the worker (entitlements to heirs)",
    titleId: "Pekerja meninggal dunia (hak kepada ahli waris)",
    category: "natural",
    articles: ["36(b)"],
    entitlement: full(2, 1),
    legalBasis: B(["36", "40"]),
  },
  {
    code: "ILLNESS_PROLONGED",
    title: "Prolonged illness / work-accident disability beyond 12 months",
    titleId: "Sakit berkepanjangan/cacat akibat kecelakaan kerja >12 bulan",
    category: "natural",
    articles: ["36(c)", "55"],
    entitlement: full(2, 1),
    legalBasis: B(["36", "55"]),
  },
  {
    code: "RETIREMENT",
    title: "Retirement (no pension scheme / pension below statutory guarantee)",
    titleId: "Pensiun (tanpa program pensiun atau manfaat di bawah jaminan)",
    category: "natural",
    articles: ["36(d)", "56"],
    entitlement: full(2, 1),
    legalBasis: B(["36", "56"]),
  },
  {
    code: "RESIGNATION",
    title: "Voluntary resignation (own will)",
    titleId: "Mengundurkan diri atas kemauan sendiri",
    category: "employee_initiative",
    articles: ["36(i)", "50"],
    entitlement: uphPlusPisah(),
    legalBasis: B(["36", "50"]),
  },
  {
    code: "ABSENTEEISM",
    title: "Absent 5+ consecutive working days after 2 proper summons",
    titleId: "Mangkir 5+ hari kerja setelah 2 panggilan patut",
    category: "employee_initiative",
    articles: ["36(h)", "51"],
    entitlement: uphPlusPisah(),
    legalBasis: B(["36", "51"]),
  },
  {
    code: "MISCONDUCT",
    title: "Serious misconduct (urgent reason, art. 52(1))",
    titleId: "Pelanggaran berat (alasan mendesak)",
    category: "employee_initiative",
    articles: ["36(g)", "52"],
    entitlement: uphPlusPisah(),
    legalBasis: B(["36", "52"]),
  },
  {
    code: "PKWT_END",
    title: "PKWT natural expiry / completed scope",
    titleId: "PKWT berakhir sesuai jangka waktu/selesainya pekerjaan",
    category: "contract_end",
    articles: ["15"],
    entitlement: {
      uph: { applicable: false },
      pkwtCompensation: { applicable: true },
    },
    legalBasis: B(["15", "16"]),
  },
  {
    code: "PKWT_EARLY_EMPLOYER",
    title: "PKWT terminated early by the employer",
    titleId: "PKWT diakhiri lebih awal oleh pengusaha",
    category: "employer_initiative",
    articles: ["17"],
    entitlement: {
      uph: { applicable: true },
      pkwtCompensation: { applicable: true },
      remainingTermWages: { applicable: true },
    },
    legalBasis: [
      { instrument: "PP 35/2021", articles: ["17"] },
      { instrument: "UU 13/2003", articles: ["62"] },
    ],
  },
];

export function findSeparationReason(code: string): SeparationReason | null {
  return ID_SEPARATION_REASONS.find((r) => r.code === code) ?? null;
}

// ---- Wage base rules (UU 6/2023 art. 157) ----
export const WAGE_BASE_RULES = {
  /** upah sebulan = upah pokok + tunjangan tetap (art. 157). */
  monthlyIncludesFixedAllowances: true,
  /** Default working days per month to derive the daily rate (6-day week). */
  defaultWorkingDaysPerMonth: 25,
  /** Leave conversion divisor: monthly wage / working days per month. */
  leaveConversionDivisor: 25,
  legalBasis: [
    { instrument: "UU 6/2023", articles: ["157"] },
    { instrument: "PP 35/2021", articles: ["40(4)"] },
  ] as LegalInstrument[],
};

// ---- PKWT regime (PP 35/2021 arts. 8, 15–17) ----
export const PKWT_RULES = {
  maxTotalMonths: 60, // 5 years incl. extensions (art. 8)
  compensationMonthsPerYear: 1, // art. 15(3): masa kerja/12 × 1 bulan upah
  legalBasis: [
    { instrument: "PP 35/2021", articles: ["8", "15", "16", "17"] },
  ] as LegalInstrument[],
};
