// H12.5 — Foundation contract tests. No IA, no DB — pure contracts.
import { describe, expect, it, beforeEach } from "vitest";
import { CapabilityRegistry } from "@/lib/uada/capabilities/CapabilityRegistry";
import { ToolRegistry } from "@/lib/uada/tools/ToolRegistry";
import { ModelRouter } from "@/lib/uada/model/router";
import {
  DEFAULT_RETENTION,
  applyRetention,
  assertTransition,
  canTransition,
  InvalidSnapshotTransition,
  type SnapshotRecord,
} from "@/lib/uada/contracts/snapshot/policy";
import type { UadaResponse } from "@/lib/uada/contracts/response";

describe("UADA H12.5 Foundation", () => {
  describe("CapabilityRegistry", () => {
    it("catalogs the 11 baseline capabilities", () => {
      const ids = CapabilityRegistry.list().map((c) => c.id).sort();
      expect(ids).toEqual(
        [
          "audit",
          "capabilities",
          "context",
          "dependencies",
          "docs",
          "graph",
          "impact",
          "plan",
          "review",
          "score",
          "search",
        ],
      );
    });

    it("each descriptor is v1.0.0 with input/output schemas", () => {
      for (const cap of CapabilityRegistry.list()) {
        expect(cap.version).toBe("1.0.0");
        expect(cap.inputSchema).toBeDefined();
        expect(cap.outputSchema).toBeDefined();
      }
    });
  });

  describe("ToolRegistry", () => {
    beforeEach(() => ToolRegistry.clear());

    it("returns null for unbound capabilities", () => {
      expect(ToolRegistry.resolve("impact")).toBeNull();
    });

    it("binds and resolves a handler", async () => {
      ToolRegistry.bind("impact", {
        implementation: "GraphTraversalService",
        handler: async () => ({ ok: true }),
      });
      const bound = ToolRegistry.resolve("impact");
      expect(bound?.implementation).toBe("GraphTraversalService");
      const out = (await bound!.handler(undefined)) as { ok: boolean };
      expect(out.ok).toBe(true);
    });
  });

  describe("ModelRouter", () => {
    it("routes every task to a supported gateway model", () => {
      const tasks = ["index", "review", "plan", "audit", "docs"] as const;
      for (const t of tasks) {
        const pick = ModelRouter.pick(t);
        expect(pick.model).toMatch(/^(google|openai)\//);
        expect(pick.reason.length).toBeGreaterThan(0);
      }
    });

    it("only sets service_tier priority on a fast-mode-capable model", () => {
      const plan = ModelRouter.pick("plan");
      // GPT-5.5 is ✓ fast-mode; the router uses priority on it.
      const providerOpts = plan.providerOptions?.lovable as Record<string, unknown> | undefined;
      if (providerOpts?.service_tier === "priority") {
        expect(plan.model.startsWith("openai/gpt-5")).toBe(true);
      }
    });
  });

  describe("Snapshot state machine", () => {
    it("allows building → active → archived → deprecated", () => {
      expect(canTransition("building", "active")).toBe(true);
      expect(canTransition("active", "archived")).toBe(true);
      expect(canTransition("archived", "deprecated")).toBe(true);
    });

    it("rejects illegal transitions", () => {
      expect(canTransition("archived", "active")).toBe(false);
      expect(canTransition("deprecated", "active")).toBe(false);
      expect(() => assertTransition("archived", "active")).toThrow(InvalidSnapshotTransition);
    });
  });

  describe("Retention policy", () => {
    const iso = (d: Date) => d.toISOString();

    it("keeps a single fresh active snapshot", () => {
      const now = new Date("2026-08-01T00:00:00Z");
      const snaps: SnapshotRecord[] = [
        {
          id: "s1",
          version: 1,
          state: "active",
          createdAt: iso(new Date("2026-07-20T00:00:00Z")),
          activatedAt: iso(new Date("2026-07-20T00:00:00Z")),
        },
      ];
      const outcome = applyRetention(snaps, DEFAULT_RETENTION, now);
      expect(outcome.keep).toHaveLength(1);
      expect(outcome.archive).toHaveLength(0);
      expect(outcome.purge).toHaveLength(0);
    });

    it("archives multiple active snapshots down to one", () => {
      const now = new Date("2026-08-01T00:00:00Z");
      const snaps: SnapshotRecord[] = [
        { id: "s1", version: 1, state: "active", createdAt: iso(new Date("2026-07-20T00:00:00Z")), activatedAt: iso(new Date("2026-07-20T00:00:00Z")) },
        { id: "s2", version: 2, state: "active", createdAt: iso(new Date("2026-07-28T00:00:00Z")), activatedAt: iso(new Date("2026-07-28T00:00:00Z")) },
      ];
      const outcome = applyRetention(snaps, DEFAULT_RETENTION, now);
      expect(outcome.keep.map((s) => s.id)).toEqual(["s2"]);
      expect(outcome.archive.map((s) => s.id)).toEqual(["s1"]);
    });

    it("purges old archived snapshots beyond retention window", () => {
      const now = new Date("2027-08-01T00:00:00Z"); // >180d after
      const snaps: SnapshotRecord[] = [
        { id: "s-old", version: 1, state: "archived", createdAt: iso(new Date("2026-01-01T00:00:00Z")), archivedAt: iso(new Date("2026-01-15T00:00:00Z")) },
      ];
      const outcome = applyRetention(snaps, DEFAULT_RETENTION, now);
      expect(outcome.purge.map((s) => s.id)).toEqual(["s-old"]);
    });

    it("respects keepArchived count", () => {
      const now = new Date("2026-08-01T00:00:00Z");
      const policy = { ...DEFAULT_RETENTION, keepArchived: 2 };
      const snaps: SnapshotRecord[] = Array.from({ length: 5 }, (_, i) => ({
        id: `a${i}`,
        version: i + 1,
        state: "archived" as const,
        createdAt: iso(new Date(2026, 6, i + 1)),
        archivedAt: iso(new Date(2026, 6, i + 2)),
      }));
      const outcome = applyRetention(snaps, policy, now);
      expect(outcome.keep.filter((s) => s.state === "archived")).toHaveLength(2);
      expect(outcome.purge).toHaveLength(3);
    });
  });

  describe("UadaResponse envelope", () => {
    it("compiles with mandatory evidence field", () => {
      const r: UadaResponse<{ hello: string }> = {
        data: { hello: "world" },
        confidence: 0.95,
        snapshotVersion: 1,
        filesUsed: ["src/lib/uada/index.ts"],
        model: "google/gemini-3.6-flash",
        evidence: [
          {
            source: "code",
            path: "src/lib/uada/index.ts",
            score: 1,
            snapshotVersion: 1,
            evidenceHash: "0".repeat(64),
          },
        ],
      };
      expect(r.evidence).toHaveLength(1);
    });
  });
});
