// H2 — In-process Event Bus with versioned event types.
// Interface is intentionally minimal so it can be swapped for
// Postgres NOTIFY / pg_net / a queue without touching callers.
import { getLogger } from "@/lib/observability/logger";

export type DomainEvent =
  | { type: "PayrollFinalized@1"; companyId: string; runId: string; rulesetVersion: string; ts: string }
  | { type: "EmployeeUpserted@1"; companyId: string; employeeId: string; ts: string }
  | { type: "ObligationStatusChanged@1"; companyId: string; obligationId: string; status: string; ts: string }
  | { type: "ContractChanged@1"; companyId: string; contractId: string; ts: string };

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void> | void;

const handlers = new Map<DomainEvent["type"], EventHandler[]>();

export function on<T extends DomainEvent["type"]>(
  type: T,
  handler: EventHandler<Extract<DomainEvent, { type: T }>>,
): void {
  const list = handlers.get(type) ?? [];
  list.push(handler as EventHandler);
  handlers.set(type, list);
}

export async function emit(event: DomainEvent): Promise<void> {
  const list = handlers.get(event.type) ?? [];
  const log = getLogger();
  await Promise.all(
    list.map(async (h) => {
      try {
        await h(event);
      } catch (err) {
        log.error("event_handler_failed", { event: event.type, err: (err as Error).message });
      }
    }),
  );
}

// Register default observability handler
on("PayrollFinalized@1", (e) => {
  getLogger().info("event", { type: e.type, companyId: e.companyId, runId: e.runId });
});
on("EmployeeUpserted@1", (e) => {
  getLogger().info("event", { type: e.type, companyId: e.companyId });
});
on("ObligationStatusChanged@1", (e) => {
  getLogger().info("event", { type: e.type, companyId: e.companyId, status: e.status });
});
on("ContractChanged@1", (e) => {
  getLogger().info("event", { type: e.type, companyId: e.companyId });
});
