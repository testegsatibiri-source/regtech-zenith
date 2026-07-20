# Migration Policy

## Schema
- All DDL through the Supabase migration tool. Every `CREATE TABLE public.*`
  ships with `GRANT`, `ENABLE RLS`, and `CREATE POLICY` in the same file.
- Never edit `src/integrations/supabase/{client,types,auth-*}.ts` — auto-generated.

## Regulatory params (no-deploy target)
Long-term (DEBT-009): params move from TS constants into
`regulatory_parameters(country, version, effective_from, payload jsonb)`.
Packs will then read `params` from that table at runtime, keyed by
`(manifest.country, current effective version)`. Bumping legal thresholds
becomes a data change — no deploy, no downtime.

## Pack upgrades
- Pack `version` bumps require no user action.
- `requiresCore` bump = coordinated Core deploy first, then pack.
