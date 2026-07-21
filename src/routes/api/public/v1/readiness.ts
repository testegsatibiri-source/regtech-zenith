// H11 — Public Readiness endpoint. No PII, no secrets: just versions,
// gate/matrix names, and per-pack status. Safe for external status pages.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/readiness")({
  server: {
    handlers: {
      GET: async () => {
        const { ensureBoot } = await import("@/lib/platform/boot.server");
        const report = await ensureBoot();
        return Response.json(report, {
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
