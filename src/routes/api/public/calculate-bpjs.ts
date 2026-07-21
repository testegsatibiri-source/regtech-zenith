// H2/H3/H6 — DEPRECATED alias for /api/public/v1/calculate-bpjs (sunset 2026-10-15).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { API_CORS_HEADERS, jsonResponse } from "@/lib/apiCors";
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";

const inputSchema = z.object({ salary: z.number().nonnegative().max(1e12) });

const DEPRECATION_HEADERS = {
  Deprecation: "true",
  Sunset: "Wed, 15 Oct 2026 00:00:00 GMT",
  Link: '</api/public/v1/calculate-bpjs>; rel="successor-version"',
};

export const Route = createFileRoute("/api/public/calculate-bpjs")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try { raw = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400, DEPRECATION_HEADERS); }
        const parsed = inputSchema.safeParse(raw);
        if (!parsed.success) return jsonResponse({ error: "Invalid input", details: parsed.error.flatten() }, 422, DEPRECATION_HEADERS);

        const pack = CountryRuntime.get("ID");
        const benefits = pack.providers.benefits!;
        const result = benefits.calculate({ salary: parsed.data.salary });
        return jsonResponse({
          schemaVersion: "1",
          engine: "BPJS",
          country: pack.manifest.country,
          rulesetVersion: pack.manifest.rulesetVersion,
          deprecated: true,
          successor: "/api/public/v1/calculate-bpjs",
          input: parsed.data,
          result: { ...result, currency: pack.manifest.currency },
        }, 200, DEPRECATION_HEADERS);
      },
    },
  },
});
