// H11.1a — Dual-signature block for the Indonesia pack PACK_VERSION.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "WzJzZXLXSHSvfz0PZSPC4w==",
    "algorithm": "Ed25519",
    "signature": "YVVEOITOH9ddBSsJcfXuABhis8aeIck7P1eEvrBgO+kht5ax+WaNDkdoYiD6UgyJcoPJcGn6h5iJjo2KNdBWCA==",
    "ts": "2026-09-01T00:05:13.028Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "TZ1+YHHpTMWnbL6fLQdMNw==",
    "algorithm": "Ed25519",
    "signature": "GM/OUNSLTXRK+KD0swK4vAJXosyKvTnX2awaG/Gn0f3AOQgtjYocqryW/75ovBCCwaKXavND94WHfQNRl5P+CQ==",
    "ts": "2026-09-01T00:05:13.028Z"
  }
};
