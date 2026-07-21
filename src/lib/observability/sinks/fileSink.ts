// H10-Obs — FileSink stub. Cold tier target: JSON lines exported to Storage
// bucket "metrics/YYYY-MM-DD/". Actual export runs from a cron job that reads
// metrics_events > 30 days and writes files. For inline ingestion this sink
// currently buffers-and-logs, keeping the interface intact so H12 can swap in
// a durable writer without changes to callers.
import type { MetricEvent, MetricSink } from "../sink";

export class FileSink implements MetricSink {
  name = "file";
  async ingest(events: MetricEvent[]): Promise<void> {
    // Cold tier is batch-driven; live-ingest is a no-op today.
    // Kept as a class so the sink registry treats it uniformly.
    if (events.length === 0) return;
  }
}
