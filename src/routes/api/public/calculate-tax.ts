// DEPRECATED — kept as alias to /api/public/v1/calculate-tax for 90 days.
// Sends Deprecation + Sunset + Link headers so clients migrate.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calculateTax } from "@/lib/engines/indonesia";
import { MARITAL_STATUS } from "@/lib/countryPacks";
import { API_CORS_HEADERS, jsonResponse } from "@/lib/apiCors";
import { getPack } from "@/lib/engines/registry";

const inputSchema = z.object({
  monthlyGross: z.number().nonnegative().max(1e12),
  maritalStatus: z.enum(MARITAL_STATUS).default("TK/0"),
  hasNpwp: z.boolean().default(true),
});

const DEPRECATION_HEADERS = {
  Deprecation: "true",
  Sunset: "Wed, 15 Oct 2026 00:00:00 GMT",
  Link: '</api/public/v1/calculate-tax>; rel="successor-version"',
};

export const Route = createFileRoute("/api/public/calculate-tax")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try { raw = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400, DEPRECATION_HEADERS); }
        const parsed = inputSchema.safeParse(raw);
        if (!parsed.success) return jsonResponse({ error: "Invalid input", details: parsed.error.flatten() }, 422, DEPRECATION_HEADERS);
        const result = calculateTax(parsed.data);
        const pack = getPack("ID");
        return jsonResponse({
          schemaVersion: "1",
          engine: "PPh21-TER",
          country: "ID",
          rulesetVersion: pack.rulesetVersion,
          deprecated: true,
          successor: "/api/public/v1/calculate-tax",
          input: parsed.data,
          result: {
            terCategory: result.category,
            effectiveRate: result.rate,
            npwpSurcharge: result.npwpSurcharge,
            tax: result.tax,
            currency: "IDR",
          },
        }, 200, DEPRECATION_HEADERS);
      },
    },
  },
});
