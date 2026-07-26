// H13 — Memory Engine. Thin CRUD over uada_memory with scope + TTL.
// Server-only: uses supabaseAdmin.

export interface MemoryEntry {
  id: string;
  scope: string;
  key: string;
  value: unknown;
  createdAt: string;
  expiresAt: string | null;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const MemoryEngine = {
  async set(scope: string, key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const db = await admin();
    const expires_at = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;
    const { error } = await db
      .from("uada_memory")
      .upsert({ scope, key, value: value as never, expires_at }, { onConflict: "scope,key" });
    if (error) throw error;
  },

  async get(scope: string, key: string): Promise<MemoryEntry | null> {
    const db = await admin();
    const { data, error } = await db
      .from("uada_memory")
      .select("id, scope, key, value, created_at, expires_at")
      .eq("scope", scope)
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
    return {
      id: data.id,
      scope: data.scope,
      key: data.key,
      value: data.value,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    };
  },

  async list(scope: string): Promise<MemoryEntry[]> {
    const db = await admin();
    const { data, error } = await db
      .from("uada_memory")
      .select("id, scope, key, value, created_at, expires_at")
      .eq("scope", scope);
    if (error) throw error;
    const now = Date.now();
    return (data ?? [])
      .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() >= now)
      .map((row) => ({
        id: row.id,
        scope: row.scope,
        key: row.key,
        value: row.value,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }));
  },

  async delete(scope: string, key: string): Promise<void> {
    const db = await admin();
    const { error } = await db.from("uada_memory").delete().eq("scope", scope).eq("key", key);
    if (error) throw error;
  },
};
