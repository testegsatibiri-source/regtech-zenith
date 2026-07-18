// H3 — API-key authentication + monthly quota for /api/public/v1/*.
// Verified callers can be identified per company; anonymous callers hit
// a token-bucket per IP so the demo endpoints stay usable but bounded.
import { sha256Hex } from "./hashing";
import { getLogger } from "./observability/logger";

export interface AuthedKey {
  id: string;
  companyId: string;
  scopes: string[];
  monthlyQuota: number;
  allowedOrigins: string[];
}

export interface AuthResult {
  kind: "keyed" | "anon";
  key?: AuthedKey;
  ip: string;
}

// ----- In-memory token bucket for anonymous IPs -----
const ANON_BUCKET = new Map<string, { tokens: number; refilledAt: number }>();
const ANON_RATE_PER_MIN = 30; // 30 req/min per IP for unauthenticated demo calls
const BUCKET_CAP = ANON_RATE_PER_MIN;

function takeAnonToken(ip: string): boolean {
  const now = Date.now();
  const b = ANON_BUCKET.get(ip) ?? { tokens: BUCKET_CAP, refilledAt: now };
  const elapsedMin = (now - b.refilledAt) / 60_000;
  b.tokens = Math.min(BUCKET_CAP, b.tokens + elapsedMin * ANON_RATE_PER_MIN);
  b.refilledAt = now;
  if (b.tokens < 1) {
    ANON_BUCKET.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  ANON_BUCKET.set(ip, b);
  return true;
}

function extractIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ??
    "0.0.0.0"
  );
}

export async function authenticateRequest(request: Request): Promise<
  | { ok: true; auth: AuthResult }
  | { ok: false; response: Response }
> {
  const ip = extractIp(request);
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  if (!bearer) {
    if (!takeAnonToken(ip)) {
      return {
        ok: false,
        response: json({ error: "Rate limit exceeded for anonymous access. Provide an API key." }, 429, {
          "Retry-After": "60",
        }),
      };
    }
    return { ok: true, auth: { kind: "anon", ip } };
  }

  if (!bearer.startsWith("sk_")) {
    return { ok: false, response: json({ error: "Invalid API key format" }, 401) };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hashed = await sha256Hex(bearer);
  const { data: keyRow, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, company_id, scopes, monthly_quota, allowed_origins, revoked_at")
    .eq("hashed_key", hashed)
    .maybeSingle();

  if (error || !keyRow || keyRow.revoked_at) {
    return { ok: false, response: json({ error: "Invalid or revoked API key" }, 401) };
  }

  const { data: quotaOk } = await supabaseAdmin.rpc("check_api_quota", {
    _key_id: keyRow.id,
    _monthly_quota: keyRow.monthly_quota,
  });
  if (quotaOk === false) {
    return { ok: false, response: json({ error: "Monthly quota exceeded" }, 429) };
  }

  return {
    ok: true,
    auth: {
      kind: "keyed",
      ip,
      key: {
        id: keyRow.id,
        companyId: keyRow.company_id,
        scopes: keyRow.scopes ?? [],
        monthlyQuota: keyRow.monthly_quota,
        allowedOrigins: keyRow.allowed_origins ?? [],
      },
    },
  };
}

export async function recordApiUsage(params: {
  keyId: string | null;
  endpoint: string;
  status: number;
  latencyMs: number;
  ip: string;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("api_usage").insert({
      key_id: params.keyId,
      endpoint: params.endpoint,
      status_code: params.status,
      latency_ms: params.latencyMs,
      ip: params.ip,
    });
    if (params.keyId) {
      await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", params.keyId);
    }
  } catch (e) {
    getLogger().warn("api_usage_write_failed", { err: (e as Error).message });
  }
}

function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...extra },
  });
}
