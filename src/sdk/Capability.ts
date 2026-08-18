// H5 — Compliance SDK: capability discovery.
export const CAPABILITIES = [
  "payroll",
  "tax",
  "benefits",
  "thirteenth",
  "overtime",
  "leave",
  "calendar",
  "contracts",
  "audit",
  "rules",
  "filings",
] as const;

export type Capability = (typeof CAPABILITIES)[number];
