// H11.1a — Dual-signature block for the Indonesia pack 1.0.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "4oSPOVFaRNyV0J7GaXb+TA==",
    "algorithm": "Ed25519",
    "signature": "c1+9Zi8cmQqgoSjsy9G3ct0lP1BHTLKWXcqgqIdfQq8+IORWiNcozVb2Nr09Yy5Pm50InZ/f0lIuUrgXirpxDw==",
    "ts": "2026-09-01T00:05:53Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "2GOR2p62Q0i5OjiW+QPCCw==",
    "algorithm": "Ed25519",
    "signature": "8SJdjok5iPrBu2lRtntPdhjzN/o4S/rAcmlg1yEyMCRhLYw/vL1FXDOHT87PRK+vxr5KTSuRRJ1ffRY5A35TAg==",
    "ts": "2026-09-01T00:05:53Z"
  }
};
