// H10-Sig / H11.1a — Signature verification helpers.
// PackSignatureRecord now carries a `keyId` used by the TrustStore for
// rotation-friendly lookup. `signer` (publisher) remains as metadata.
import type { SigningCapability } from "./trust-policy";

export interface PackSignatureRecord {
  signer: string;         // publisher metadata (audit / display)
  keyId: string;          // primary lookup id
  publicKey: string;      // base64 (kept for fallback verification)
  algo: "ed25519";
  signature: string;      // base64 signature
  capability: SigningCapability;
  ts: string;
}

export type VerificationResult =
  | { ok: true; verified: true }
  | { ok: false; verified: false; reason: string }
  | { ok: true; verified: false; reason: "crypto-unavailable" };

function base64ToBytes(b64: string): Uint8Array {
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function verifyEd25519(
  message: Uint8Array,
  signatureB64: string,
  publicKeyB64: string,
): Promise<VerificationResult> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) {
      return { ok: true, verified: false, reason: "crypto-unavailable" };
    }
    const key = await crypto.subtle.importKey(
      "raw",
      base64ToBytes(publicKeyB64) as unknown as ArrayBuffer,
      { name: "Ed25519" } as unknown as AlgorithmIdentifier,
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      { name: "Ed25519" } as unknown as AlgorithmIdentifier,
      key,
      base64ToBytes(signatureB64) as unknown as ArrayBuffer,
      message as unknown as ArrayBuffer,
    );
    return ok
      ? { ok: true, verified: true }
      : { ok: false, verified: false, reason: "invalid-signature" };
  } catch (err) {
    return { ok: false, verified: false, reason: (err as Error).message };
  }
}
