// H11.1a — Dual-signature block for the Indonesia pack 2.1.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  "author": {
    "publisher": "uboard-id",
    "keyId": "golCBP/DTX223uivtU36wg==",
    "algorithm": "Ed25519",
    "signature": "YnzekgQvKWG1oUYJzrLV6PT3+26HHEasZ6THnr8r+sB0l4SqnvtktSic8dGj649TmokASvaDF2OqcaahIlfLBg==",
    "ts": "2026-09-01T00:25:35Z"
  },
  "countersign": {
    "publisher": "platform-cto-id",
    "keyId": "WKtpTgGMQeyJmtlC+y8FdQ==",
    "algorithm": "Ed25519",
    "signature": "/9r/671unKTqf3H7aqlOQCEd6jMZu/4qnhVTUs4UVMK8fBmJ8TDIGIxmyMfezKtuTofs5+ikq48uDkpdtfleAg==",
    "ts": "2026-09-01T00:25:35Z"
  }
};
