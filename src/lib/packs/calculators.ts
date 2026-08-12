/**
 * Which jurisdictions ship an interactive public calculator.
 * Presentation only — a pack without an entry simply shows no calculator.
 */
const PACK_CALCULATORS = new Set(["ID"]);

export function hasCalculator(countryCode: string): boolean {
  return PACK_CALCULATORS.has(countryCode.toUpperCase());
}
