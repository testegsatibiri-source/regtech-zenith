# ADR-0015 — Metrics Hot/Cold Sinks

**Status:** Accepted (H10)

## Decision

`MetricSink` interface plus a registry that fans events to all registered
sinks. H10 registers `PostgresSink` (hot, 30 days) and `FileSink` (cold, 365
days). H12+ adds `AxiomSink` / `BetterStackSink` as adapters.

## Retention plan
- Postgres: last 30 days (real-time queries and alerts).
- Cold storage: 365 days (audit + analytics).
- Cron job exports > 30d rows to cold and truncates hot.

## Consequences

- Postgres cost stays bounded even at scale.
- Third-party observability platforms can be adopted without changes to
  the logger, metrics API, or business code.
