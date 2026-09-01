// H10-Sig / H11.1a — TrustStore abstraction.
// H11.1a adds keyId as the primary identifier so publishers can rotate keys
// without changing manifests. `find(publisher, publicKey)` remains available
// for legacy callers.
import type { SigningCapability } from "./trust-policy";

export interface TrustedKey {
  keyId: string;
  publisher: string;
  publicKey: string; // base64 Ed25519 raw (32B)
  algo: string; // "ed25519"
  capabilities: SigningCapability[];
  provider: "db" | "kms" | "hsm";
  active: boolean;
  revokedAt?: string | null;
}

export interface TrustStore {
  name: string;
  listActive(): Promise<TrustedKey[]>;
  find(publisher: string, publicKey: string): Promise<TrustedKey | undefined>;
  findByKeyId?(keyId: string): Promise<TrustedKey | undefined>;
}

export class MemoryTrustStore implements TrustStore {
  name = "memory";
  constructor(private readonly keys: TrustedKey[]) {}
  async listActive(): Promise<TrustedKey[]> {
    return this.keys.filter((k) => k.active && !k.revokedAt);
  }
  async find(publisher: string, publicKey: string): Promise<TrustedKey | undefined> {
    return this.keys.find((k) => k.publisher === publisher && k.publicKey === publicKey);
  }
  async findByKeyId(keyId: string): Promise<TrustedKey | undefined> {
    return this.keys.find((k) => k.keyId === keyId && k.active && !k.revokedAt);
  }
}
