import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calculateBpjs } from "@/lib/engines/indonesia";
import { API_CORS_HEADERS, jsonResponse } from "@/lib/apiCors";

const inputSchema = z.object({
  salary: z.number().nonnegative(),
});

export const Route = createFileRoute("/api/public/calculate-bpjs")({
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
        const result = calculateBpjs(parsed.data.salary);
        return jsonResponse({
          engine: "BPJS",
          country: "ID",
          input: parsed.data,
          result: { ...result, currency: "IDR" },
        });
      },
    },
  },
});
