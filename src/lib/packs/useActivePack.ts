// H19 — Active Country Pack resolution for the authenticated workspace.
// The workspace never hardcodes a jurisdiction: every screen derives its
// engines, labels and currency from the company's `country_code` through the
// CountryRuntime (ADR-0033 — single source of pack truth per request).
import { useMemo } from "react";
import { CountryRuntime, type CountryPack } from "@/sdk";
import "@/sdk/bootstrap";
import { useCompany } from "@/lib/companyContext";

export interface ActivePack {
  /** ISO-3166 alpha-2 of the company's jurisdiction. */
  code: string;
  /** Human name from the pack manifest, falls back to the raw code. */
  name: string;
  currency: string;
  version?: string;
  rulesetVersion?: string;
  /** Null when no pack is installed/healthy for that jurisdiction. */
  pack: CountryPack | null;
  supports: (capability: string) => boolean;
}

export function resolveActivePack(code: string, currencyHint: string): ActivePack {
  const pack = (() => {
    try {
      return CountryRuntime.find(code);
    } catch {
      return null;
    }
  })();

  return {
    code,
    name: pack?.manifest.name ?? code,
    currency: pack?.manifest.currency ?? currencyHint,
    version: pack?.manifest.version,
    rulesetVersion: pack?.manifest.rulesetVersion,
    pack,
    supports: (capability: string) => !!pack && pack.supports(capability as never),
  };
}

export function useActivePack(): ActivePack {
  const { company } = useCompany();
  const code = company?.country_code ?? "ID";
  const currency = company?.currency ?? "IDR";
  return useMemo(() => resolveActivePack(code, currency), [code, currency]);
}
