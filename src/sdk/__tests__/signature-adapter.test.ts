import { describe, expect, it } from "vitest";
import { signatureBlockToRecords } from "@/sdk/signature-adapter";
import type { SignatureBlock } from "@/sdk/manifest";

const block: SignatureBlock = {
  author: {
    publisher: "publisher-a",
    keyId: "key-a",
    algorithm: "Ed25519",
    signature: "signature-a",
    ts: "2026-01-01T00:00:00Z",
  },
  countersign: {
    publisher: "publisher-b",
    keyId: "key-b",
    algorithm: "Ed25519",
    signature: "signature-b",
    ts: "2026-01-01T00:00:00Z",
  },
};

describe("signatureBlockToRecords", () => {
  it("maps the author envelope to a namespaced signing capability", () => {
    expect(signatureBlockToRecords({ author: block.author })).toEqual([
      {
        signer: "publisher-a",
        keyId: "key-a",
        publicKey: "",
        algo: "ed25519",
        signature: "signature-a",
        capability: "pack.sign",
        ts: "2026-01-01T00:00:00Z",
      },
    ]);
  });

  it("maps countersign separately instead of elevating author capability", () => {
    expect(
      signatureBlockToRecords(block).map(({ signer, keyId, capability }) => ({
        signer,
        keyId,
        capability,
      })),
    ).toEqual([
      { signer: "publisher-a", keyId: "key-a", capability: "pack.sign" },
      { signer: "publisher-b", keyId: "key-b", capability: "pack.countersign" },
    ]);
  });

  it("returns no records when the manifest has no signature block", () => {
    expect(signatureBlockToRecords(undefined)).toEqual([]);
  });
});
