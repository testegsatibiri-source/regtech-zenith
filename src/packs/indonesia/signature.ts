// H11.1a — Dual-signature block for the Indonesia pack 1.0.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "WA+LXrzHR/Gh0X9bOIuiKQ==",
    "algorithm": "Ed25519",
    "signature": "jkisBWkSQhGGbyagfDsPgBd9Tgc7HTCBIp85Re4RjGS5jh0rZHfpuZkUxHd96ElMCySht6wTyNsFLnTMzTHcCg==",
    "ts": "2026-09-01T00:13:44Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "R+jeXN+JTRuuPbY9ybjT4g==",
    "algorithm": "Ed25519",
    "signature": "36Dq0PA1U6aUdqUYmnTgkIAupMbw4wRodVihVgYcy0sGUDRya7haPbh227InuVqQkR/qy0OWoe2yt8HiCLpYAg==",
    "ts": "2026-09-01T00:13:44Z"
  }
};
