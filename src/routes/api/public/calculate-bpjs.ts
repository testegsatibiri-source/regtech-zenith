// DEPRECATED — kept as alias to /api/public/v1/calculate-bpjs for 90 days.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calculateBpjs } from "@/lib/engines/indonesia";
import { API_CORS_HEADERS, jsonResponse } from "@/lib/apiCors";
import { getPack } from "@/lib/engines/registry";

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
        const result = calculateBpjs(parsed.data.salary);
        const pack = getPack("ID");
        return jsonResponse({
          schemaVersion: "1",
          engine: "BPJS",
          country: "ID",
          rulesetVersion: pack.rulesetVersion,
          deprecated: true,
          successor: "/api/public/v1/calculate-bpjs",
          input: parsed.data,
          result: { ...result, currency: "IDR" },
        }, 200, DEPRECATION_HEADERS);
      },
    },
  },
});
