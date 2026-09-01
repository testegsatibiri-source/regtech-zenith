// H3 — CORS helpers. Public demo endpoints get "*"; keyed endpoints echo
// the caller's origin only when it matches the api_keys.allowed_origins list.
const BASE_HEADERS = {
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Request-Id",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
} as const;

export const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  ...BASE_HEADERS,
} as const;

export function corsHeadersFor(
  origin: string | null,
  allowedOrigins: string[],
): Record<string, string> {
  if (!origin) return { ...BASE_HEADERS };
  if (
    allowedOrigins.length === 0 ||
    allowedOrigins.includes("*") ||
    allowedOrigins.includes(origin)
  ) {
    return { "Access-Control-Allow-Origin": origin, ...BASE_HEADERS };
  }
  return { ...BASE_HEADERS };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...API_CORS_HEADERS, ...extraHeaders },
  });
}
