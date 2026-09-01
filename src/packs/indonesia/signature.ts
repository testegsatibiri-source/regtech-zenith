// H11.1a — Dual-signature block for the Indonesia pack 2.2.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-id",
    keyId: "mbeTstZjSdmBd4phK9YmvA==",
    algorithm: "Ed25519",
    signature:
      "fpBdbi1MGBGsx2EUQ66xCwJFWpuSwuY7lrnj3XIC5WAAuWjvnh1Eg8I/65y544pi8yMEXZp0t4rSWDXQPte8CA==",
    ts: "2026-09-01T00:46:52Z",
  },
  countersign: {
    publisher: "platform-cto-id",
    keyId: "fCdwK3cTTM2uaAQ9Q2SpAQ==",
    algorithm: "Ed25519",
    signature:
      "xIgeRWydIvsZ0LDF61KfXSYGoFsmkQHKRmQii6s74yLKbybblXh+n7uEgInw6+jCfGLKeyqewmnoL1dub4yACA==",
    ts: "2026-09-01T00:46:52Z",
  },
};
