// H11.1a — Dual-signature block for the Indonesia pack 2.0.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "gksfG1yRQhy5MTjRHvnaCA==",
    "algorithm": "Ed25519",
    "signature": "a7Q3c0oO6Enl8aMLeSZxQrTgauto4Edrs9PwFmhj21TY481yjX2HCTcv89sOh9aDMugu/atfmYruXuBBsiH9Dg==",
    "ts": "2026-09-01T00:14:10Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "DZCuff74TjCujLdp3e9I8A==",
    "algorithm": "Ed25519",
    "signature": "EymGhKrOY9Ip/SiRJbDkQA4eIAnUyiqZKgLQonpvvMQWlip4WhOQdxLzIs7mGiMIjk1PO+FU6sNhoF+OZK8aCQ==",
    "ts": "2026-09-01T00:14:10Z"
  }
};
