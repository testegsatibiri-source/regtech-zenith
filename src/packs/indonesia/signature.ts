// H11.1a — Dual-signature block for the Indonesia pack 1.0.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "7OKQ4IeARTqVQ/UHj1w5ug==",
    "algorithm": "Ed25519",
    "signature": "zKlA1bAHmNIfKnG/Ky1dHbhq+jIxtRA0Rv0Oj11vtn+u9Wp0j/ThuSc8WDcd0D1ksPjk2qC2BJMeRa4O4HwJAQ==",
    "ts": "2026-09-01T00:13:12Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "bIMneYL6TWO3bnGYzZdBIw==",
    "algorithm": "Ed25519",
    "signature": "uiaGrhqBOOuZIdJiJ9u+2NZUMSc5My7MFWvEo+zJptz64/+rVG6HNiTeO30ndn4zyZYXhkwYhfRAMVyRHfMjDw==",
    "ts": "2026-09-01T00:13:12Z"
  }
};
