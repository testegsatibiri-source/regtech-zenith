# ADR-0006 — Backoffice Surface ("Compliance OS Platform")

- **Status:** Accepted (Sprint H8-BO)
- **Date:** 2026-07-21
- **Deciders:** Platform, Country CTOs, Ops

## Context

The customer app (`/_authenticated/*`) and the platform administration
surface have different audiences, permission surfaces, and change cadence.
Mixing them in the same shell creates two problems: (1) role checks leak into
every screen, and (2) admin releases are gated on customer app releases.

## Decision

We ship a separate **Platform Backoffice** surface at `/platform/*`, isolated
from the customer app:

- Own layout (`src/routes/platform/route.tsx`) with its own navigation and
  visual identity (destructive-tinted brand mark).
- Own auth gate: any of the four platform roles unlocks the surface; every
  action is gated server-side by `PermissionService`.
- Own service layer (`src/lib/platform/service/*`) that never leaks into the
  customer app graph.
- Own API (`src/lib/platform/api.functions.ts`) — the UI never imports
  `@/sdk/*` directly (see ADR-0008).

Logical, not physical, separation for now — same monorepo, same deploy — to
keep iteration velocity. Physical split criteria live in
`docs/repository-strategy.md`.

## Consequences

- **+** Admin work does not touch customer app code.
- **+** Trivial to hide the whole surface behind a feature flag or move it to
  its own subdomain later.
- **−** Two shells to maintain visually; mitigated by shared shadcn tokens.
