// H11.1a — Dual-signature block for the Indonesia pack v1.9.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-id",
    keyId: "789b515ec1b48c1875fc1551a4f76763",
    algorithm: "Ed25519",
    signature: "IMZiT3LICYLwfh4sypW3KrrjKlLN8T4bINkO5KF9b2RNP7/C+huxJIRepwRS7TxqdYQVljTrC0+DFxDO+vCUAw==",
    ts: "2026-07-21T00:00:00Z",
  },
  countersign: {
    publisher: "platform-cto",
    keyId: "3d66a1c26cccd4dc0daae68eccde5461",
    algorithm: "Ed25519",
    signature: "XjQwRHVjK1dm/u6FUO9bDwQ7T3IaOY5/NDm1RsCTROFiPt0oV9Sk5LFf2luZt9Tnuv1FxcFLZTU6Fknl0z36BQ==",
    ts: "2026-07-21T00:00:00Z",
  },
};
