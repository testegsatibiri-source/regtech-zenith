# ADR-0010 — Observability Layers, Hot/Cold Metrics & Incidents

**Status:** Accepted (H10)
**Context:** As the platform grows to dozens of country packs and hundreds
of tenants, a single "metrics" firehose becomes unusable. We also need to
capture operational learning through structured incidents and postmortems.

## Decision

### Layered taxonomy
Every metric event carries a `layer` field, one of:
`runtime | api | database | packs | business`.

Dashboards, alerts, and queries filter by layer to answer scoped questions:
- runtime — Country Runtime + Compatibility Service
- api    — public API + platform API
- database — Postgres/RLS latency, quotas
- packs   — per-country pack health, install/upgrade rates
- business — payroll runs, obligations completed, compliance score

### Hot/Cold tiering
`MetricSink` interface + registry. H10 registers two sinks:
- `PostgresSink` — hot (last 30 days) → `public.metrics_events`
- `FileSink`     — cold (>= 30 days) → Storage bucket `metrics/YYYY-MM-DD/`

A cron job (H10 stub, H11 activation) exports rows > 30d out of the DB and
truncates the hot tier. H12+ adds `AxiomSink` / `BetterStackSink` as adapters
without touching logger/metrics primitives.

### Incidents + Postmortems
- `incidents(severity P1..P4, status, layer, opened_by, resolved_at)`
- `postmortems(incident_id, cause, resolution, prevention, published_at)`
- Alerts link to incidents via `alert_incidents`.

## Consequences

- Adding a new observability backend = one adapter class implementing `MetricSink`.
- Operational memory (cause/resolution/prevention) becomes queryable.
- Postgres cost stays bounded (30-day window).
