// H10-Sig / H11.1a — DbTrustStore + signing service. Reads/writes
// pack_signing_keys. `key_id` is the primary rotation identifier.
import type { TrustStore, TrustedKey } from "@/sdk/trust-store";
import type { SigningCapability } from "@/sdk/trust-policy";

const COLS = "publisher, public_key, algo, capabilities, provider, active, revoked_at, key_id";

export class DbTrustStore implements TrustStore {
  name = "db";
  async listActive(): Promise<TrustedKey[]> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pack_signing_keys").select(COLS).eq("active", true).is("revoked_at", null);
    if (error) throw error;
    return (data ?? []).map(rowToKey);
  }
  async find(publisher: string, publicKey: string): Promise<TrustedKey | undefined> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pack_signing_keys").select(COLS)
      .eq("publisher", publisher).eq("public_key", publicKey).maybeSingle();
    if (error) throw error;
    return data ? rowToKey(data) : undefined;
  }
  async findByKeyId(keyId: string): Promise<TrustedKey | undefined> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pack_signing_keys").select(COLS)
      .eq("key_id", keyId).eq("active", true).is("revoked_at", null).maybeSingle();
    if (error) throw error;
    return data ? rowToKey(data) : undefined;
  }
}

interface KeyRow {
  publisher: string;
  public_key: string;
  algo: string;
  capabilities: string[];
  provider: string;
  active: boolean;
  revoked_at: string | null;
  key_id: string | null;
}
function rowToKey(r: KeyRow): TrustedKey {
  return {
    keyId: r.key_id ?? "",
    publisher: r.publisher,
    publicKey: r.public_key,
    algo: r.algo,
    capabilities: (r.capabilities ?? []) as SigningCapability[],
    provider: (r.provider as TrustedKey["provider"]) ?? "db",
    active: r.active,
    revokedAt: r.revoked_at,
  };
}

export const trustStore = new DbTrustStore();
