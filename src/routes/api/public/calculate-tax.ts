import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calculateTax } from "@/lib/engines/indonesia";
import { MARITAL_STATUS } from "@/lib/countryPacks";
import { API_CORS_HEADERS, jsonResponse } from "@/lib/apiCors";

const inputSchema = z.object({
  monthlyGross: z.number().nonnegative(),
  maritalStatus: z.enum(MARITAL_STATUS).default("TK/0"),
  hasNpwp: z.boolean().default(true),
});

export const Route = createFileRoute("/api/public/calculate-tax")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }
        const parsed = inputSchema.safeParse(raw);
        if (!parsed.success) {
          return jsonResponse({ error: "Invalid input", details: parsed.error.flatten() }, 422);
        }
        const result = calculateTax(parsed.data);
        return jsonResponse({
          engine: "PPh21-TER",
          country: "ID",
          input: parsed.data,
          result: {
            terCategory: result.category,
            effectiveRate: result.rate,
            npwpSurcharge: result.npwpSurcharge,
            tax: result.tax,
            currency: "IDR",
          },
        });
      },
    },
  },
});
