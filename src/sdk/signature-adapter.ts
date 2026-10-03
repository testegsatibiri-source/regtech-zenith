// H11.1a — Convert a manifest's signature envelopes into SDK verification records.
// This adapter preserves the declared key IDs and never treats an envelope as trusted:
// CompatibilityService must still resolve each key from the active TrustStore and verify
// the Ed25519 signature against canonical manifest bytes.
import type { SignatureBlock, SignatureEnvelope } from "./manifest";
import type { PackSignatureRecord } from "./signing";

function toRecord(
  envelope: SignatureEnvelope,
  capability: PackSignatureRecord["capability"],
): PackSignatureRecord {
  return {
    signer: envelope.publisher ?? "",
    keyId: envelope.keyId,
    // keyId is the primary TrustStore lookup. The verifier never falls back to
    // this empty value when a keyId lookup succeeds.
    publicKey: "",
    algo: "ed25519",
    signature: envelope.signature,
    capability,
    ts: envelope.ts ?? "",
  };
}

export function signatureBlockToRecords(block: SignatureBlock | undefined): PackSignatureRecord[] {
  if (!block) return [];
  const records = [toRecord(block.author, "pack.sign")];
  if (block.countersign) records.push(toRecord(block.countersign, "pack.countersign"));
  return records;
}
