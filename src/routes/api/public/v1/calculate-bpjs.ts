// H2/H3 — Versioned public endpoint: POST /api/public/v1/calculate-bpjs
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { API_CORS_HEADERS, corsHeadersFor, jsonResponse } from "@/lib/apiCors";
import { authenticateRequest, recordApiUsage } from "@/lib/apiAuth";
import { getPack } from "@/lib/engines/registry";
import { timed } from "@/lib/observability/metrics";
import { traceIdFromRequest } from "@/lib/observability/traceId";

const inputSchema = z.object({
  salary: z.number().nonnegative().max(1e12),
  country: z.enum(["ID"]).default("ID"),
});

export const Route = createFileRoute("/api/public/v1/calculate-bpjs")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, {
        status: 204,
        headers: { ...API_CORS_HEADERS, ...corsHeadersFor(request.headers.get("origin"), ["*"]) },
      }),
      POST: async ({ request }) => {
        const start = performance.now();
        const traceId = traceIdFromRequest(request);
        const auth = await authenticateRequest(request);
        if (!auth.ok) return auth.response;
        const authed = auth.auth;

        if (request.headers.get("content-length") && Number(request.headers.get("content-length")) > 8192) {
          return jsonResponse({ error: "Payload too large" }, 413);
        }
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return finish(jsonResponse({ error: "Invalid JSON body" }, 400), 400);
        }
        const parsed = inputSchema.safeParse(raw);
        if (!parsed.success) {
          return finish(jsonResponse({ error: "Invalid input", details: parsed.error.flatten() }, 422), 422);
        }

        const pack = getPack(parsed.data.country);
        if (!pack.socialEngine) {
          return finish(jsonResponse({ error: `No social-security engine for ${pack.code}` }, 501), 501);
        }
        const result = await timed("engine.bpjs", () => pack.socialEngine!({ salary: parsed.data.salary }), {
          country: pack.code,
          trace_id: traceId,
        });

        const response = jsonResponse({
          schemaVersion: "1",
          engine: "BPJS",
          country: pack.code,
          rulesetVersion: pack.rulesetVersion,
          input: parsed.data,
          result: { ...result, currency: pack.currency },
        }, 200, { "x-request-id": traceId, "x-ruleset-version": pack.rulesetVersion });
        return finish(response, 200);

        async function finish(res: Response, status: number): Promise<Response> {
          const latencyMs = Math.round(performance.now() - start);
          await recordApiUsage({
            keyId: authed.key?.id ?? null,
            endpoint: "/api/public/v1/calculate-bpjs",
            status,
            latencyMs,
            ip: authed.ip,
          });
          return res;
        }
      },
    },
  },
});
