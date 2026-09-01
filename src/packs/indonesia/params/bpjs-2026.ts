// H23-A — BPJS Ketenagakerjaan & Kesehatan parameters for Indonesia, 2026.
//
// Sources:
//   - BPJS Ketenagakerjaan official article (17 Dec 2025):
//     https://www.bpjsketenagakerjaan.go.id/artikel/18913/artikel-berapa-besaran-iuran-jht,-jkk,-jkm,-jp-dan-jkp
//   - BPJS Kesehatan PPU rates are widely reported as 5% (1% employee, 4% employer)
//     with a monthly ceiling (teto) of Rp 12.000.000. The ceiling for 2026 has
//     not been confirmed from a primary BPJS Kesehatan decree in this harvest,
//     so it is marked `sourceStatus: "media-report"`.
//
// All figures carry `sourceStatus` so the engine can report conclusiveness
// honestly. A reconciliation against the official 2026 decrees should flip
// each entry to `"official"` before Indonesia advances past H23-A.

export type BpjsSourceStatus = "official" | "media-report" | "stale";

export interface BpjsRiskLevel {
  code: string;
  description: string;
  employerRate: number;
}

export interface BpjsParamEntry {
  key: string;
  employeeRate?: number;
  employerRate?: number;
  cap?: number;
  source: string;
  sourceStatus: BpjsSourceStatus;
  legalBasis: string;
}

export interface BpjsParams {
  version: string;
  effectiveFrom: string;
  health: BpjsParamEntry & { employeeRate: number; employerRate: number; cap: number };
  jht: BpjsParamEntry & { employeeRate: number; employerRate: number };
  jp: BpjsParamEntry & { employeeRate: number; employerRate: number; cap: number };
  jkk: BpjsParamEntry & { riskLevels: BpjsRiskLevel[] };
  jkm: BpjsParamEntry & { employerRate: number };
  jkp: BpjsParamEntry & {
    governmentRate: number;
    jkkRecomposition: number;
    jkmRecomposition: number;
  };
}

const OFFICIAL = "official";
const MEDIA = "media-report";

export const BPJS_2026: BpjsParams = {
  version: "2026.1",
  effectiveFrom: "2026-01-01",
  health: {
    key: "id.bpjs.health",
    employeeRate: 0.01,
    employerRate: 0.04,
    cap: 12_000_000,
    source: "BPJS Kesehatan PPU rates (widely reported); 2026 ceiling pending primary decree",
    sourceStatus: MEDIA,
    legalBasis: "UU 40/2004; PP 86/2013; PMK/BPJS Kesehatan tariffs",
  },
  jht: {
    key: "id.bpjs.jht",
    employeeRate: 0.02,
    employerRate: 0.037,
    source: "BPJS Ketenagakerjaan official article, 17 Dec 2025",
    sourceStatus: OFFICIAL,
    legalBasis: "PP 6/2025",
  },
  jp: {
    key: "id.bpjs.jp",
    employeeRate: 0.01,
    employerRate: 0.02,
    cap: 10_547_000,
    source: "BPJS Ketenagakerjaan official article, 17 Dec 2025",
    sourceStatus: OFFICIAL,
    legalBasis: "UU 24/2011; PP 6/2025",
  },
  jkk: {
    key: "id.bpjs.jkk",
    source: "BPJS Ketenagakerjaan official article, 17 Dec 2025",
    sourceStatus: OFFICIAL,
    legalBasis: "PP 6/2025",
    riskLevels: [
      { code: "very-low", description: "Risiko sangat rendah", employerRate: 0.0024 },
      { code: "low", description: "Risiko rendah", employerRate: 0.0054 },
      { code: "medium", description: "Risiko menengah", employerRate: 0.0089 },
      { code: "high", description: "Risiko tinggi", employerRate: 0.0127 },
      { code: "very-high", description: "Risiko sangat tinggi", employerRate: 0.0174 },
    ],
  },
  jkm: {
    key: "id.bpjs.jkm",
    employerRate: 0.003,
    source: "BPJS Ketenagakerjaan official article, 17 Dec 2025",
    sourceStatus: OFFICIAL,
    legalBasis: "PP 6/2025",
  },
  jkp: {
    key: "id.bpjs.jkp",
    governmentRate: 0.0022,
    jkkRecomposition: 0.0014,
    jkmRecomposition: 0.001,
    source: "BPJS Ketenagakerjaan official article, 17 Dec 2025",
    sourceStatus: OFFICIAL,
    legalBasis: "UU 40/2004; PP 6/2025",
  },
};

export function bpjsConclusive(params: BpjsParams): boolean {
  return (
    params.health.sourceStatus === "official" &&
    params.jht.sourceStatus === "official" &&
    params.jp.sourceStatus === "official" &&
    params.jkk.sourceStatus === "official" &&
    params.jkm.sourceStatus === "official" &&
    params.jkp.sourceStatus === "official"
  );
}
