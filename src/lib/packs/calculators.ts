import { CountryRuntime } from "@/sdk";
import { classify } from "./catalog";
import "@/sdk/bootstrap";

/**
 * Which jurisdictions ship an interactive public calculator.
 * Presentation only — a pack without an entry simply shows no calculator.
 *
 * H20: the calculator is now gated on the pack being in Production tier, not
 * just on a static capability list. A Validation pack (e.g. PH during H20) may
 * have engines but must not expose an interactive public calculator until its
 * regulatory accuracy is declared commercially ready.
 */
const PACK_CALCULATORS = new Set(["ID", "PH"]);

export function hasCalculator(countryCode: string): boolean {
  const upper = countryCode.toUpperCase();
  if (!PACK_CALCULATORS.has(upper)) return false;
  const rec = CountryRuntime.record(upper);
  if (!rec) return false;
  return classify(rec).tier === "production";
}
