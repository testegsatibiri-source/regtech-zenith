// H11.1a — Dual-signature block for the Indonesia pack 2.1.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "6klNsu2rRYmV+tI8JXR2MA==",
    "algorithm": "Ed25519",
    "signature": "JbyfmGGnV5BjssgYRtWiIvU8TQlmZsWDU4hw6S/uPWP7/f1a2wsH/6HV39vkIeek/WoON4M4tEbsKr5yuZPNAg==",
    "ts": "2026-09-01T00:25:26Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "kPpwl0jiSM6UsTk++TI4og==",
    "algorithm": "Ed25519",
    "signature": "O1LMHz4Q+qIEQArCZTQuzpnV72aZsV1eahDEkMMqUiyjUf12Bi1FfZymnekZQHJwrdDGj4j5G/50ti8QEQu8Dg==",
    "ts": "2026-09-01T00:25:26Z"
  }
};
