// Indonesia Evidence Register v1.0 — machine-readable twin of
// docs/governance/evidence-register/ID-evidence-register-v1.0.md.
// Jurisdiction-scoped: this file MUST NOT reference PH evidence or gaps.
// Change evidence here AND in the doc; a test enforces parity.
import type { EvidenceRecord, GapRecord, GateDefinition } from "../types";
import { evaluateAssurance } from "../engine";

export const ID_REGISTER_VERSION = "1.0";

export const ID_EVIDENCE: EvidenceRecord[] = [
  {
    evidenceId: "EV-ID-TER-001",
    controlId: "PAY-PPH21",
    domain: "payroll",
    claim:
      "PPh 21 uses the official TER A/B/C tables (PP 58/2023 lampiran) plus UU HPP art. 17 annual reconciliation.",
    layer: "TEST",
    status: "PARTIAL",
    source:
      "src/packs/indonesia/params/ter-tables.ts; src/packs/indonesia/params/pph21-annual.ts; src/lib/engines/indonesia.ts",
    version: "ID-2026.4",
    effectiveFrom: "2024-01-01",
    expiresAt: "2027-03-31",
    owner: "country_cto:ID",
    relatedGaps: ["GAP-ID-TER-OCR-001", "GAP-ID-LEGAL-001"],
  },
  {
    evidenceId: "EV-ID-BPJS-001",
    controlId: "PAY-BPJS",
    domain: "payroll",
    claim:
      "BPJS Ketenagakerjaan 2026 rates (JHT 2%/3,7%, JP 1%/2% cap Rp 10.547.000, JKK 5 risk levels, JKM 0,3%, JKP) applied per component.",
    layer: "TEST",
    status: "VERIFIED",
    source:
      "src/packs/indonesia/params/bpjs-2026.ts; src/packs/indonesia/__tests__/h23-a.test.ts",
    version: "ID-2026.4",
    effectiveFrom: "2026-01-01",
    expiresAt: "2027-03-31",
    owner: "country_cto:ID",
    relatedGaps: ["GAP-ID-BPJS-CEILING-001", "GAP-ID-LEGAL-001"],
  },
  {
    evidenceId: "EV-ID-UMP-001",
    controlId: "LAB-MINWAGE",
    domain: "labor",
    claim:
      "UMP 2026 minimum wage floors for 38 provinces enforced by rule ID-UMR-01 (non-conclusive while sources are secondary).",
    layer: "TEST",
    status: "PARTIAL",
    source: "src/packs/indonesia/params/ump-2026.ts; src/packs/indonesia/__tests__/ump.test.ts",
    version: "ID-2026.4",
    effectiveFrom: "2026-01-01",
    expiresAt: "2027-03-31",
    owner: "country_cto:ID",
    relatedGaps: ["GAP-ID-UMP-OFFICIAL-001", "GAP-ID-LEGAL-001"],
  },
  {
    evidenceId: "EV-ID-SEPARATION-001",
    controlId: "LAB-SEPARATION",
    domain: "labor",
    claim:
      "Termination pay per PP 35/2021 (pesangon, UPMK, UPH) with typified grounds and PKWT/PKWTT handling.",
    layer: "TEST",
    status: "VERIFIED",
    source:
      "src/packs/indonesia/engines/separation.ts; src/components/separations/IdSeparationPanel.tsx",
    version: "ID-2026.4",
    effectiveFrom: "2021-02-02",
    expiresAt: "2027-03-31",
    owner: "country_cto:ID",
    relatedGaps: ["GAP-ID-LEGAL-001"],
  },
  {
    evidenceId: "EV-ID-FILING-001",
    controlId: "REG-FILING",
    domain: "regulatory",
    claim:
      "Statutory report generation per published layout; acceptance on DJP/BPJS portals not yet demonstrated.",
    layer: "IMPLEMENTATION",
    status: "PENDING",
    source: "src/lib/filings.functions.ts; src/routes/_authenticated/filings.tsx",
    version: "ID-2026.4",
    effectiveFrom: "2026-01-01",
    expiresAt: "2027-03-31",
    owner: "country_cto:ID",
    relatedGaps: ["GAP-ID-FILING-001"],
  },
  {
    evidenceId: "EV-ID-SECURITY-001",
    controlId: "SEC-SIGN",
    domain: "security",
    claim: "Pack integrity via Ed25519 dual signature verified at install (v2.2.0 / ID-2026.4).",
    layer: "TEST",
    status: "VERIFIED",
    source:
      "src/packs/indonesia/signature.ts; scripts/sign-id.ts; src/packs/__tests__/signature-tamper.test.ts",
    version: "2.2.0",
    effectiveFrom: "2026-08-30",
    expiresAt: "2027-08-30",
    owner: "platform_admin",
    relatedGaps: ["GAP-ID-OPS-SLA-001"],
  },
  {
    evidenceId: "EV-ID-PRIVACY-001",
    controlId: "PRV-UUPDP",
    domain: "privacy",
    claim:
      "UU PDP (Law 27/2022) consent versioning, retention and field encryption implemented for pilot data.",
    layer: "IMPLEMENTATION",
    status: "PARTIAL",
    source: "src/lib/privacy.functions.ts; src/lib/pilot.functions.ts; docs/adr/ADR-0038-commercial-readiness-privacy-extension.md",
    version: "1.0",
    effectiveFrom: "2026-09-08",
    expiresAt: "2027-03-31",
    owner: "platform_admin",
    relatedGaps: ["GAP-ID-PDP-DPO-001"],
  },
];

export const ID_GAPS: GapRecord[] = [
  {
    gapId: "GAP-ID-LEGAL-001",
    title: "External legal opinion from Indonesian counsel on tables and calculation logic",
    state: "OPEN",
    owner: "ceo",
    closureCriterion: "Signed opinion covering PPh 21, BPJS, UMP and PP 35/2021, dual sign-off",
  },
  {
    gapId: "GAP-ID-TER-OCR-001",
    title: "Human visual re-check of TER B/C bounds against the scanned DJP PDF (DEBT-026)",
    state: "OPEN",
    owner: "country_cto:ID",
    closureCriterion: "Reviewer sign-off recorded against the rendered primary PDF",
  },
  {
    gapId: "GAP-ID-UMP-OFFICIAL-001",
    title: "UMP 2026 values sourced from primary provincial decrees instead of media reports",
    state: "OPEN",
    owner: "country_cto:ID",
    closureCriterion: "All 38 provinces tagged sourceStatus: official with decree references",
  },
  {
    gapId: "GAP-ID-BPJS-CEILING-001",
    title: "BPJS Kesehatan salary ceiling confirmed against the primary decree",
    state: "OPEN",
    owner: "country_cto:ID",
    closureCriterion: "Ceiling parameter tagged official with decree reference",
  },
  {
    gapId: "GAP-ID-FILING-001",
    title: "Real submission acceptance on DJP and BPJS portals",
    state: "OPEN",
    owner: "country_cto:ID",
    closureCriterion: "Pilot submissions accepted and evidence archived",
  },
  {
    gapId: "GAP-ID-PDP-DPO-001",
    title: "UU PDP data protection officer, 72h breach runbook and controller agreement",
    state: "OPEN",
    owner: "platform_admin",
    closureCriterion: "DPO appointed, runbook approved, agreement signed",
  },
  {
    gapId: "GAP-ID-OPS-SLA-001",
    title: "SLA in WIB timezone + professional liability cover",
    state: "OPEN",
    owner: "ceo",
    closureCriterion: "Signed SLA and policy on file",
  },
];

export const ID_GATES: GateDefinition[] = [
  {
    gate: "H20",
    name: "payrollCorrectness",
    requires: [
      { evidenceId: "EV-ID-TER-001", minLayer: "REGULATORY" },
      { evidenceId: "EV-ID-BPJS-001", minLayer: "REGULATORY" },
      { evidenceId: "EV-ID-UMP-001", minLayer: "REGULATORY" },
      { evidenceId: "EV-ID-SEPARATION-001", minLayer: "REGULATORY" },
    ],
    blockingGaps: [
      { gapId: "GAP-ID-LEGAL-001", effect: "condition" },
      { gapId: "GAP-ID-TER-OCR-001", effect: "condition" },
    ],
  },
  {
    gate: "H21",
    name: "regulatoryOperations",
    requires: [{ evidenceId: "EV-ID-FILING-001", minLayer: "PRODUCTION" }],
    blockingGaps: [{ gapId: "GAP-ID-FILING-001", effect: "fail" }],
  },
  {
    gate: "H22",
    name: "laborCoverage",
    requires: [
      { evidenceId: "EV-ID-UMP-001", minLayer: "TEST" },
      { evidenceId: "EV-ID-SEPARATION-001", minLayer: "TEST" },
    ],
    blockingGaps: [
      { gapId: "GAP-ID-UMP-OFFICIAL-001", effect: "fail" },
      { gapId: "GAP-ID-BPJS-CEILING-001", effect: "condition" },
    ],
  },
  {
    gate: "H23",
    name: "privacySecurity",
    requires: [
      { evidenceId: "EV-ID-SECURITY-001", minLayer: "TEST" },
      { evidenceId: "EV-ID-PRIVACY-001", minLayer: "REGULATORY" },
    ],
    blockingGaps: [{ gapId: "GAP-ID-PDP-DPO-001", effect: "fail" }],
  },
  {
    gate: "H24",
    name: "enterpriseOperations",
    requires: [{ evidenceId: "EV-ID-SECURITY-001", minLayer: "TEST" }],
    blockingGaps: [{ gapId: "GAP-ID-OPS-SLA-001", effect: "condition" }],
  },
];

export function evaluateId(evaluatedAt: string) {
  return evaluateAssurance({
    country: "ID",
    registerVersion: ID_REGISTER_VERSION,
    evidence: ID_EVIDENCE,
    gaps: ID_GAPS,
    definitions: ID_GATES,
    evaluatedAt,
  });
}
