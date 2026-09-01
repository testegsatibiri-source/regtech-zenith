// H11.1a — Dual-signature block for the Indonesia pack 1.0.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "TFX50fxqTtqJkKj9MVau5g==",
    "algorithm": "Ed25519",
    "signature": "n4iXilBsqfQrsl3w0lj/s9Vl6xwwQF2yE9vRNQP8DoQUUqBKnMqBEC9Sn4VP7Lf6TvNE7T+GAAHxvTeDkS8dAw==",
    "ts": "2026-09-01T00:13:33Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "Vf3p82HJSX2LASZ4DeHmDg==",
    "algorithm": "Ed25519",
    "signature": "YuzFznbfysijEni/9NNqOIIATUh4n6dcc8P3QSyExqetAYL/qqf76u9ull1rYfhlsncwS94GisY1UB5XVDSBAw==",
    "ts": "2026-09-01T00:13:33Z"
  }
};
