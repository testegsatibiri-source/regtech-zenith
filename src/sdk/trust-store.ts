// H10-Sig — TrustStore abstraction. DbTrustStore ships in H10; future
// adapters (AwsKmsTrustStore, GoogleKmsTrustStore, HsmTrustStore) implement
// the same interface without changes to Runtime or CompatibilityService.
import type { SigningCapability } from "./trust-policy";

export interface TrustedKey {
  publisher: string;
  publicKey: string;      // base64 Ed25519
  algo: string;           // "ed25519"
  capabilities: SigningCapability[];
  provider: "db" | "kms" | "hsm";
  active: boolean;
  revokedAt?: string | null;
}

export interface TrustStore {
  name: string;
  /** List all currently active trusted keys. */
  listActive(): Promise<TrustedKey[]>;
  /** Fetch a specific key by publisher + public key. */
  find(publisher: string, publicKey: string): Promise<TrustedKey | undefined>;
}

/**
 * In-memory store useful for tests and preview seeding. Production uses
 * DbTrustStore (see src/lib/platform/service/signing.ts) which reads from
 * public.pack_signing_keys.
 */
export class MemoryTrustStore implements TrustStore {
  name = "memory";
  constructor(private readonly keys: TrustedKey[]) {}
  async listActive(): Promise<TrustedKey[]> {
    return this.keys.filter((k) => k.active && !k.revokedAt);
  }
  async find(publisher: string, publicKey: string): Promise<TrustedKey | undefined> {
    return this.keys.find((k) => k.publisher === publisher && k.publicKey === publicKey);
  }
}
