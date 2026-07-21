// H2/H3/H6 — DEPRECATED alias for /api/public/v1/calculate-tax (sunset 2026-10-15).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MARITAL_STATUS } from "@/lib/countryPacks";
import { API_CORS_HEADERS, jsonResponse } from "@/lib/apiCors";
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap";

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

        const pack = CountryRuntime.get("ID");
        const tax = pack.providers.tax!;
        const result = tax.calculate(parsed.data);
        return jsonResponse({
          schemaVersion: "1",
          engine: "PPh21-TER",
          country: pack.manifest.country,
          rulesetVersion: pack.manifest.rulesetVersion,
          deprecated: true,
          successor: "/api/public/v1/calculate-tax",
          input: parsed.data,
          result: {
            terCategory: result.category,
            effectiveRate: result.rate,
            npwpSurcharge: result.surcharge,
            tax: result.tax,
            currency: pack.manifest.currency,
          },
        }, 200, DEPRECATION_HEADERS);
      },
    },
  },
});
