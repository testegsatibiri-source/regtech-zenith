// H4 — Public health endpoint (no PII).
import { createFileRoute } from "@tanstack/react-router";
import { API_CORS_HEADERS, jsonResponse } from "@/lib/apiCors";
import { listPacks } from "@/lib/engines/registry";

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
          const { error } = await supabaseAdmin.from("companies").select("id", { count: "exact", head: true });
          dbLatencyMs = Math.round(performance.now() - t0);
          if (error) dbStatus = "degraded";
        } catch {
          dbStatus = "down";
        }
        return jsonResponse({
          status: dbStatus === "ok" ? "ok" : "degraded",
          uptime_ms: Math.round(performance.now() - start),
          db: { status: dbStatus, latency_ms: dbLatencyMs },
          rulesets: listPacks().map((p) => ({ code: p.code, version: p.rulesetVersion })),
          schemaVersion: "1",
        });
      },
    },
  },
});
