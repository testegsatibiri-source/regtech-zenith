// H2/H3 — Versioned public endpoint: POST /api/public/v1/calculate-tax
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MARITAL_STATUS } from "@/lib/countryPacks";
import { API_CORS_HEADERS, corsHeadersFor, jsonResponse } from "@/lib/apiCors";
import { authenticateRequest, recordApiUsage } from "@/lib/apiAuth";
import { getPack } from "@/lib/engines/registry";
import { timed } from "@/lib/observability/metrics";
import { traceIdFromRequest } from "@/lib/observability/traceId";

const inputSchema = z.object({
  monthlyGross: z.number().nonnegative().max(1e12),
  maritalStatus: z.enum(MARITAL_STATUS).default("TK/0"),
  hasNpwp: z.boolean().default(true),
  country: z.enum(["ID"]).default("ID"),
});

export const Route = createFileRoute("/api/public/v1/calculate-tax")({
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
        const result = await timed("engine.tax", () => pack.taxEngine(parsed.data), {
          country: pack.code,
          trace_id: traceId,
        });

        const response = jsonResponse({
          schemaVersion: "1",
          engine: "PPh21-TER",
          country: pack.code,
          rulesetVersion: pack.rulesetVersion,
          input: parsed.data,
          result: {
            terCategory: result.category,
            effectiveRate: result.rate,
            npwpSurcharge: result.surcharge,
            tax: result.tax,
            currency: pack.currency,
          },
        }, 200, { "x-request-id": traceId, "x-ruleset-version": pack.rulesetVersion });
        return finish(response, 200);

        async function finish(res: Response, status: number): Promise<Response> {
          const latencyMs = Math.round(performance.now() - start);
          await recordApiUsage({
            keyId: authed.key?.id ?? null,
            endpoint: "/api/public/v1/calculate-tax",
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
