import { createFileRoute } from "@tanstack/react-router";
import { openApiSpec } from "@/lib/openapiSpec";
import { API_CORS_HEADERS } from "@/lib/apiCors";

export const Route = createFileRoute("/api/public/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      GET: async () =>
        new Response(JSON.stringify(openApiSpec), {
          status: 200,
          headers: { "Content-Type": "application/json", ...API_CORS_HEADERS },
        }),
    },
  },
});
