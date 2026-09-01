// H11.1a — Dual-signature block for the Indonesia pack 1.0.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "yAs2xWZpQW6ToVyaoeSmUw==",
    "algorithm": "Ed25519",
    "signature": "U3m6jLKeHmPzmyXkoE0S4Hy5+46cwkBMDm4wPMGUHAaGweEkDmMs381W8qfpVSg/BMrdss2XwcwzGgrvt5ztBw==",
    "ts": "2026-09-01T00:13:21Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "3fEA2Or3RXaZPAIzchRZeQ==",
    "algorithm": "Ed25519",
    "signature": "F3XXq8lP/JQ4OjK5j78Eo/6rvxH+mipr0DxZbt0CG1vt1djIZoC/aMHDuumbPfNwmgLkL4XVexMnx1yi5erjDg==",
    "ts": "2026-09-01T00:13:21Z"
  }
};
