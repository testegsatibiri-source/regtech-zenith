// H6 — Expected capability interface versions the Core supports.
// Bumping a value here means the Core requires providers of that capability
// to advertise at least this minor version.
import type { Capability } from "./Capability";

export const EXPECTED_INTERFACES: Record<Capability, string> = {
  payroll: "1.0",
  tax: "1.0",
  benefits: "1.0",
  thirteenth: "1.0",
  overtime: "1.0",
  leave: "1.0",
  calendar: "1.0",
  contracts: "1.0",
  audit: "1.0",
  rules: "1.0",
  filings: "1.0",
};
