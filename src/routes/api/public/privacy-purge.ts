// H23 Fase D (D5b) — Scheduled retention purge endpoint.
// Called by the scheduler (pg_cron / external) with the shared secret.
// No PII is returned: only counters per category.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  companyId: z.string().uuid().optional(),
  dryRun: z.boolean().optional(),
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/privacy-purge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PRIVACY_PURGE_SECRET"];
        if (!secret) {
          return new Response(JSON.stringify({ error: "purge_not_configured" }), {
            status: 503,
            headers: { "content-type": "application/json" },
          });
        }
        const provided =
          request.headers.get("x-purge-secret") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!provided || !timingSafeEqual(provided, secret)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        let parsed: z.infer<typeof bodySchema> = {};
        try {
          const raw = await request.text();
          if (raw.trim()) parsed = bodySchema.parse(JSON.parse(raw));
        } catch {
          return new Response(JSON.stringify({ error: "invalid_body" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const { runRetentionPurge } = await import("@/lib/privacy/retention-purge.server");
        try {
          const report = await runRetentionPurge({
            companyId: parsed.companyId,
            dryRun: parsed.dryRun ?? false,
            actorId: null,
            source: "scheduled",
          });
          return new Response(JSON.stringify({ ok: true, report }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "purge_failed" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
