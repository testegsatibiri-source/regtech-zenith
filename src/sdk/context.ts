// H6 — ProviderContext: siblings injected by the Runtime.
// Providers must never import sibling providers by path. When a provider needs
// tax/benefits/etc, it receives them via `ctx.siblings`.
import type { Providers } from "./CountryPack";
import type { Capability } from "./Capability";
import type { ConfigService } from "./config";

export interface ProviderContext {
  /** ISO country code of the owning pack. */
  country: string;
  /** Ruleset version snapshot (for audit trails). */
  rulesetVersion: string;
  /** Sibling providers from the SAME pack. */
  siblings: Readonly<Providers>;
  /** Read a foreign pack's provider — returns undefined if the pack or capability is missing. */
  foreign?: (country: string, capability: Capability) => unknown | undefined;
  /** H10 — configuration lookups routed through the ConfigProvider chain. */
  config?: ConfigService;
}
