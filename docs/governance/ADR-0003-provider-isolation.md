# ADR-0003 — Provider Isolation & Context Injection

**Status:** Accepted (Sprint H6, 2026-07-20)
**Deciders:** Core Platform team

## Context

Sprint H5 introduced a Compliance SDK where each `CountryPack` exposes typed
providers (`TaxProvider`, `PayrollProvider`, …). At install-time the Runtime
knows which providers a pack advertises, but at call-time the providers still
imported sibling providers by relative path when they needed cross-capability
data (e.g. `payroll.buildPayslip` reaching into `calculateTax`).

This created a hidden dependency graph invisible to the Runtime: a broken tax
implementation would silently break payroll, and swapping in a different tax
provider (v2, or a partner's implementation) required editing the payroll code.

## Decision

1. Providers MUST NOT import other providers by path. They receive siblings
   through a `ProviderContext`:

    ```ts
    interface ProviderContext {
      country: string;
      rulesetVersion: string;
      siblings: Readonly<Providers>;
      foreign?: (country, capability) => unknown | undefined;
    }
    ```

2. Every provider method accepts an optional `ctx?: ProviderContext` as the
   last argument. The Runtime builds a fresh context per resolution via
   `CountryRuntime.contextFor(code)`.

3. Cross-pack access (e.g. an audit provider in ID reading MY calendar data)
   goes through `ctx.foreign(country, capability)` — never through direct
   `import from "@/packs/<other>"`.

4. The Test Kit's `runIsolationSuite(pack, dir)` scans the pack source and
   fails the build on any import from another pack.

## Consequences

- Providers become swappable: a partner can ship a `TaxProvider@1.1` without
  touching payroll code.
- Cross-cutting concerns (logging, tracing) are added by wrapping the
  `ProviderContext.siblings` object at Runtime resolve-time.
- Migration: existing pack-internal helpers (`src/lib/engines/*` owned by
  Indonesia) are allowed — they are the pack's private implementation, not
  another *provider*. The rule only prohibits cross-provider imports.
