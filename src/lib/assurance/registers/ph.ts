// Philippines Evidence Register v1.0 — machine-readable twin of
// docs/governance/evidence-register/PH-evidence-register-v1.0.md.
// Change evidence here AND in the doc; a test enforces parity.
import type { EvidenceRecord, GapRecord, GateDefinition } from "../types";
import { evaluateAssurance } from "../engine";

export const PH_REGISTER_VERSION = "1.0";

export const PH_EVIDENCE: EvidenceRecord[] = [
  {
    evidenceId: "EV-PH-SSS-001",
    controlId: "PAY-SSS",
    domain: "payroll",
    claim: "SSS contributions follow Circular 2024-006 (15%, MSC 5,000–35,000 + MPF).",
    layer: "TEST",
    status: "VERIFIED",
    source: "src/packs/philippines/params.ts; docs/governance/legal-opinions/PH-sss-msc-2026-09-16.md",
    version: "PH-2025.1",
    effectiveFrom: "2025-01-01",
    expiresAt: "2027-03-31",
    owner: "country_cto:PH",
    relatedGaps: ["GAP-PH-LEGAL-001"],
  },
  {
    evidenceId: "EV-PH-BIR-001",
    controlId: "PAY-WHT",
    domain: "payroll",
    claim: "Withholding tax follows the TRAIN (RA 10963) 2023+ table.",
    layer: "TEST",
    status: "VERIFIED",
    source: "src/packs/philippines/engines/tax.ts; docs/governance/legal-opinions/PH-bir-withholding-2026-09-16.md",
    version: "PH-2025.1",
    effectiveFrom: "2023-01-01",
    expiresAt: "2027-03-31",
    owner: "country_cto:PH",
    relatedGaps: ["GAP-PH-LEGAL-001"],
  },
  {
    evidenceId: "EV-PH-WAGE-NCR-001",
    controlId: "LAB-MINWAGE",
    domain: "labor",
    claim: "NCR minimum wage floor (NCR-28, PHP 755/day) enforced with golden tests.",
    layer: "TEST",
    status: "VERIFIED",
    source: "src/packs/philippines/params.ts; src/packs/philippines/__tests__/wage-golden.test.ts",
    version: "PH-2025.1",
    effectiveFrom: "2025-07-17",
    expiresAt: "2027-03-31",
    owner: "country_cto:PH",
    relatedGaps: ["GAP-PH-WAGE-REGIONAL-001", "GAP-PH-LEGAL-001"],
  },
  {
    evidenceId: "EV-PH-SEPARATION-001",
    controlId: "LAB-SEPARATION",
    domain: "labor",
    claim: "Separation pay per Labor Code Arts. 297–299 with immutable approved cases.",
    layer: "TEST",
    status: "VERIFIED",
    source: "src/packs/philippines/engines/separation.ts; src/components/separations/PhSeparationPanel.tsx",
    version: "PH-2025.1",
    effectiveFrom: "2025-01-01",
    expiresAt: "2027-03-31",
    owner: "country_cto:PH",
    relatedGaps: ["GAP-PH-LEGAL-001"],
  },
  {
    evidenceId: "EV-PH-FILING-001",
    controlId: "REG-FILING",
    domain: "regulatory",
    claim:
      "Filing files (BIR 1601-C, Alphalist, SSS R-3, PhilHealth RF-1, Pag-IBIG MCRF) generated per available layout; portal acceptance pending.",
    layer: "TEST",
    status: "PARTIAL",
    source: "src/packs/philippines/engines/filings/index.ts; src/routes/_authenticated/filings.tsx",
    version: "PH-2025.1",
    effectiveFrom: "2025-01-01",
    expiresAt: "2027-03-31",
    owner: "country_cto:PH",
    relatedGaps: ["GAP-PH-FILING-001"],
  },
  {
    evidenceId: "EV-PH-SECURITY-001",
    controlId: "SEC-SIGN",
    domain: "security",
    claim: "Pack integrity via Ed25519 dual signature verified at install.",
    layer: "TEST",
    status: "VERIFIED",
    source: "src/packs/philippines/signature.ts; scripts/sign-ph.ts; src/packs/__tests__/signature-tamper.test.ts",
    version: "1.7.0",
    effectiveFrom: "2026-09-23",
    expiresAt: "2027-09-23",
    owner: "platform_admin",
    relatedGaps: ["GAP-PH-OPS-SLA-001"],
  },
  {
    evidenceId: "EV-PH-PRIVACY-001",
    controlId: "PRV-RA10173",
    domain: "privacy",
    claim: "RA 10173 assessment documented with 4 open items (PH-RA10173-1..4).",
    layer: "IMPLEMENTATION",
    status: "PARTIAL",
    source: "docs/governance/legal-opinions/PH-data-protection-ra10173.md",
    version: "1.0",
    effectiveFrom: "2026-09-23",
    expiresAt: "2027-03-31",
    owner: "platform_admin",
    relatedGaps: ["GAP-PH-DPA-DPO-001"],
  },
];

export const PH_GAPS: GapRecord[] = [
  { gapId: "GAP-PH-LEGAL-001", title: "External legal opinion (IBP-registered PH counsel) on tables + calculation logic", state: "OPEN", owner: "ceo", closureCriterion: "Signed opinion covering 5 tables, dual sign-off" },
  { gapId: "GAP-PH-FILING-001", title: "Real upload acceptance on BIR eFPS/eBIRForms, SSS, PhilHealth, Pag-IBIG portals", state: "OPEN", owner: "country_cto:PH", closureCriterion: "5 filings accepted in pilot, evidence archived" },
  { gapId: "GAP-PH-WAGE-REGIONAL-001", title: "Wage Order resolution beyond NCR (location + industry + effective date)", state: "OPEN", owner: "country_cto:PH", closureCriterion: "All RTWPB wage orders modeled with sources and goldens" },
  { gapId: "GAP-PH-OVERTIME-001", title: "Compositional overtime / night diff / holiday premium engine", state: "OPEN", owner: "country_cto:PH", closureCriterion: "DOLE premium engine with golden tests" },
  { gapId: "GAP-PH-DPA-DPO-001", title: "DPO appointment, 72h breach runbook, field encryption of PH identifiers", state: "OPEN", owner: "platform_admin", closureCriterion: "PH-RA10173-1..4 closed" },
  { gapId: "GAP-PH-OPS-SLA-001", title: "SLA in PHT timezone + E&O insurance", state: "OPEN", owner: "ceo", closureCriterion: "Signed SLA and policy on file" },
];

export const PH_GATES: GateDefinition[] = [
  {
    gate: "H20",
    name: "payrollCorrectness",
    requires: [
      { evidenceId: "EV-PH-SSS-001", minLayer: "REGULATORY" },
      { evidenceId: "EV-PH-BIR-001", minLayer: "REGULATORY" },
      { evidenceId: "EV-PH-WAGE-NCR-001", minLayer: "REGULATORY" },
      { evidenceId: "EV-PH-SEPARATION-001", minLayer: "REGULATORY" },
    ],
    blockingGaps: [{ gapId: "GAP-PH-LEGAL-001", effect: "condition" }],
  },
  {
    gate: "H21",
    name: "regulatoryOperations",
    requires: [{ evidenceId: "EV-PH-FILING-001", minLayer: "PRODUCTION" }],
    blockingGaps: [{ gapId: "GAP-PH-FILING-001", effect: "fail" }],
  },
  {
    gate: "H22",
    name: "laborCoverage",
    requires: [{ evidenceId: "EV-PH-WAGE-NCR-001", minLayer: "TEST" }],
    blockingGaps: [
      { gapId: "GAP-PH-WAGE-REGIONAL-001", effect: "fail" },
      { gapId: "GAP-PH-OVERTIME-001", effect: "fail" },
    ],
  },
  {
    gate: "H23",
    name: "privacySecurity",
    requires: [
      { evidenceId: "EV-PH-SECURITY-001", minLayer: "TEST" },
      { evidenceId: "EV-PH-PRIVACY-001", minLayer: "REGULATORY" },
    ],
    blockingGaps: [{ gapId: "GAP-PH-DPA-DPO-001", effect: "fail" }],
  },
  {
    gate: "H24",
    name: "enterpriseOperations",
    requires: [{ evidenceId: "EV-PH-SECURITY-001", minLayer: "TEST" }],
    blockingGaps: [{ gapId: "GAP-PH-OPS-SLA-001", effect: "condition" }],
  },
];

export function evaluatePh(evaluatedAt: string) {
  return evaluateAssurance({
    country: "PH",
    registerVersion: PH_REGISTER_VERSION,
    evidence: PH_EVIDENCE,
    gaps: PH_GAPS,
    definitions: PH_GATES,
    evaluatedAt,
  });
}
