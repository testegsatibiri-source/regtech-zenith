// H10-Obs — MetricSink. H10 registers PostgresSink (hot; last 30 days) and a
// FileSink stub. H12+ adds AxiomSink / BetterStackSink as adapters without
// touching the logger/metrics primitives.
export type MetricLayer = "runtime" | "api" | "database" | "packs" | "business";

export interface MetricEvent {
  name: string;
  layer: MetricLayer;
  value: number;
  ts?: string;
  tags?: Record<string, unknown>;
}

export interface MetricSink {
  name: string;
  ingest(events: MetricEvent[]): Promise<void>;
}

class MultiSink implements MetricSink {
  name = "multi";
  constructor(private readonly sinks: MetricSink[]) {}
  async ingest(events: MetricEvent[]): Promise<void> {
    await Promise.all(
      this.sinks.map((s) =>
        s.ingest(events).catch((e) => {
          // never let a sink failure break the caller
          console.warn(`[metrics:${s.name}] ingest failed`, e);
        }),
      ),
    );
  }
  add(sink: MetricSink) {
    this.sinks.push(sink);
  }
  list(): readonly MetricSink[] {
    return this.sinks;
  }
}

class NoopSink implements MetricSink {
  name = "noop";
  async ingest(): Promise<void> {
    /* discard */
  }
}

const registry = new MultiSink([new NoopSink()]);

export function registerSink(sink: MetricSink): void {
  registry.add(sink);
}
export function getSinks(): readonly MetricSink[] {
  return registry.list();
}

export async function emitMetric(event: MetricEvent): Promise<void> {
  await registry.ingest([{ ts: new Date().toISOString(), ...event }]);
}
