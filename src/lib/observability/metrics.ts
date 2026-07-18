// H4 — Metrics primitives. Timing + counters emitted to structured logs.
// Persistent metrics writes to public.metrics_events are best-effort and
// batched inside handlers when supabaseAdmin is already loaded.
import { getLogger } from "./logger";

export async function timed<T>(
  name: string,
  fn: () => Promise<T> | T,
  tags: Record<string, unknown> = {},
): Promise<T> {
  const start = performance.now();
  const log = getLogger();
  try {
    const result = await fn();
    const value_ms = Math.round(performance.now() - start);
    log.info("metric", { name, value_ms, ...tags });
    return result;
  } catch (err) {
    const value_ms = Math.round(performance.now() - start);
    log.error("metric_error", { name, value_ms, err: (err as Error).message, ...tags });
    throw err;
  }
}

export function counter(name: string, tags: Record<string, unknown> = {}): void {
  getLogger().info("counter", { name, ...tags });
}
