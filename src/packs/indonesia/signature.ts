// H11.1a — Dual-signature block for the Indonesia pack 1.0.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "X/Sz8RU8RI+xEOxmq36CEg==",
    "algorithm": "Ed25519",
    "signature": "xZIC39rfELtQD+aWbnYqSfvtyVRhOKA+crGQTt1+9TgYv9g6O9U1x0xpeOq+5Jh6ecBJuaxBvgfdadqqmdg0CA==",
    "ts": "2026-09-01T00:12:59Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "YWH2TdY9TWecWUzn6irIdw==",
    "algorithm": "Ed25519",
    "signature": "GHhusryAWwsd8WjIpJfA0LTgFuiW8UeDSSiKTvU6I91oPPRsnToY+cgYX48jqta80TWfjK09NR2gEwO0tj1MDw==",
    "ts": "2026-09-01T00:12:59Z"
  }
};
