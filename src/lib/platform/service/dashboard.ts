// H8-BO — Dashboard service. Aggregates snapshot indicators.
import type { PlatformContext } from "./context";
import { permissionService } from "../permissionService";
import { CountryRuntime } from "@/sdk";

export interface DashboardSnapshot {
  packs: {
    total: number;
    installed: number;
    degraded: number;
    failed: number;
    incompatible: number;
  };
  health: { averageOk: number; countriesChecked: number };
  releases: {
    pending: { draft: number; candidate: number; approved: number };
    active: number;
  };
  parameters: { review: number; approved: number; active: number };
  recentAudit: Array<{
    id: string;
    action: string;
    country_code: string | null;
    component: string | null;
    at: string;
  }>;
}

export const dashboardService = {
  async snapshot(ctx: PlatformContext): Promise<DashboardSnapshot> {
    permissionService.ensure("dashboard.view", ctx.policy);

    const packs = CountryRuntime.list();
    const countByStatus = (s: string) => packs.filter((p) => p.status === s).length;

    // Health: run health() on installed packs (cheap enough for dashboard;
    // caches sit outside the service for now).
    let okCount = 0;
    let checked = 0;
    for (const p of packs) {
      if (p.status !== "installed" && p.status !== "degraded") continue;
      try {
        const h = await CountryRuntime.health(p.pack.manifest.country);
        checked++;
        if (h.status === "ok") okCount++;
      } catch {
        /* ignore */
      }
    }

    const [releasesRes, paramsRes, auditRes] = await Promise.all([
      ctx.supabase
        .from("pack_installations")
        .select("status")
        .in("status", ["draft", "candidate", "approved", "released"]),
      ctx.supabase
        .from("regulatory_parameters")
        .select("status")
        .in("status", ["review", "approved", "active"]),
      ctx.supabase
        .from("platform_audit_log")
        .select("id, action, country_code, component, at")
        .order("at", { ascending: false })
        .limit(10),
    ]);

    const releaseRows = releasesRes.data ?? [];
    const paramRows = paramsRes.data ?? [];

    return {
      packs: {
        total: packs.length,
        installed: countByStatus("installed"),
        degraded: countByStatus("degraded"),
        failed: countByStatus("failed"),
        incompatible: countByStatus("incompatible"),
      },
      health: {
        averageOk: checked === 0 ? 1 : okCount / checked,
        countriesChecked: checked,
      },
      releases: {
        pending: {
          draft: releaseRows.filter((r) => r.status === "draft").length,
          candidate: releaseRows.filter((r) => r.status === "candidate").length,
          approved: releaseRows.filter((r) => r.status === "approved").length,
        },
        active: releaseRows.filter((r) => r.status === "released").length,
      },
      parameters: {
        review: paramRows.filter((r) => r.status === "review").length,
        approved: paramRows.filter((r) => r.status === "approved").length,
        active: paramRows.filter((r) => r.status === "active").length,
      },
      recentAudit: auditRes.data ?? [],
    };
  },
};
