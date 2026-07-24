// H12.5 — ToolRegistry: HOW each capability is executed. Populated by the
// engines/services layer at H13+. The Orchestrator (H19) resolves capability
// ids to bound tools here.
import type { CapabilityId } from "@/lib/uada/capabilities/CapabilityRegistry";

export interface ToolBinding<I = unknown, O = unknown> {
  capabilityId: CapabilityId;
  /** Human-readable class/service name for logs and debugging. */
  implementation: string;
  handler: (input: I) => Promise<O>;
}

class Registry {
  private readonly bindings = new Map<CapabilityId, ToolBinding>();

  bind<I, O>(capabilityId: CapabilityId, binding: Omit<ToolBinding<I, O>, "capabilityId">): void {
    this.bindings.set(capabilityId, { capabilityId, ...binding } as ToolBinding);
  }

  resolve(capabilityId: CapabilityId): ToolBinding | null {
    return this.bindings.get(capabilityId) ?? null;
  }

  list(): ToolBinding[] {
    return Array.from(this.bindings.values());
  }

  clear(): void {
    this.bindings.clear();
  }
}

export const ToolRegistry = new Registry();
