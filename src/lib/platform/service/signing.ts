// H10-Sig — DbTrustStore + signing service. Reads/writes pack_signing_keys.
import type { TrustStore, TrustedKey } from "@/sdk/trust-store";
import type { SigningCapability } from "@/sdk/trust-policy";

export class DbTrustStore implements TrustStore {
  name = "db";
  async listActive(): Promise<TrustedKey[]> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pack_signing_keys")
      .select("publisher, public_key, algo, capabilities, provider, active, revoked_at")
      .eq("active", true)
      .is("revoked_at", null);
    if (error) throw error;
    return (data ?? []).map(rowToKey);
  }
  async find(publisher: string, publicKey: string): Promise<TrustedKey | undefined> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pack_signing_keys")
      .select("publisher, public_key, algo, capabilities, provider, active, revoked_at")
      .eq("publisher", publisher)
      .eq("public_key", publicKey)
      .maybeSingle();
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
}
function rowToKey(r: KeyRow): TrustedKey {
  return {
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
