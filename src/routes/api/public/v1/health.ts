// H4/H6 — Public health endpoint (no PII). Reports DB + installed country packs + per-pack health.
import { createFileRoute } from "@tanstack/react-router";
import { API_CORS_HEADERS, jsonResponse } from "@/lib/apiCors";
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";

export const Route = createFileRoute("/api/public/v1/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      GET: async () => {
        const start = performance.now();
        let dbLatencyMs: number | null = null;
        let dbStatus: "ok" | "degraded" | "down" = "ok";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const t0 = performance.now();
          const { error } = await supabaseAdmin
            .from("companies")
            .select("id", { count: "exact", head: true });
          dbLatencyMs = Math.round(performance.now() - t0);
          if (error) dbStatus = "degraded";
        } catch {
          dbStatus = "down";
        }

        const packRecords = CountryRuntime.list();
        const packs = await Promise.all(
          packRecords.map(async (r) => {
            let health: { status: string } | undefined;
            if (r.status === "installed" || r.status === "degraded") {
              try {
                health = await CountryRuntime.health(r.pack.manifest.country);
              } catch {
                /* ignore */
              }
            }
            return {
              code: r.pack.manifest.country,
              version: r.pack.manifest.version,
              rulesetVersion: r.pack.manifest.rulesetVersion,
              status: r.status,
              health: health?.status ?? "unknown",
              warnings: r.validation?.warnings.length ?? 0,
            };
          }),
        );

        const anyDegraded =
          dbStatus !== "ok" || packs.some((p) => p.status !== "installed" || p.health !== "ok");
        return jsonResponse({
          status: anyDegraded ? "degraded" : "ok",
          uptime_ms: Math.round(performance.now() - start),
          db: { status: dbStatus, latency_ms: dbLatencyMs },
          packs,
          schemaVersion: "1",
        });
      },
    },
  },
});
