// H2/H5/H6 — In-process Event Bus. Types delegated to the SDK event catalog.
import { getLogger } from "@/lib/observability/logger";
import type { SdkEvent } from "@/sdk/events";

export type DomainEvent = SdkEvent;

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

// Default observability handlers.
on("PayrollFinalized@1", (e) =>
  getLogger().info("event", { type: e.type, companyId: e.companyId, runId: e.runId }),
);
on("EmployeeUpserted@1", (e) =>
  getLogger().info("event", { type: e.type, companyId: e.companyId }),
);
on("ObligationStatusChanged@1", (e) =>
  getLogger().info("event", { type: e.type, companyId: e.companyId, status: e.status }),
);
on("ContractChanged@1", (e) => getLogger().info("event", { type: e.type, companyId: e.companyId }));
on("CountryPackInstalled@1", (e) =>
  getLogger().info("event", { type: e.type, country: e.country, version: e.version }),
);
on("CountryPackValidated@1", (e) =>
  getLogger().info("event", {
    type: e.type,
    country: e.country,
    ok: e.ok,
    errors: e.errors,
    warnings: e.warnings,
  }),
);
on("CountryPackFailed@1", (e) =>
  getLogger().warn("event", { type: e.type, country: e.country, reason: e.reason }),
);
on("CountryPackHealthChecked@1", (e) =>
  getLogger().info("event", { type: e.type, country: e.country, status: e.status }),
);
