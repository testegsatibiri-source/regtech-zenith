// H17 — Dual-signature block for the Philippines pack v1.0.0.
// Generated over the canonical manifest bytes (see
// src/packs/indonesia/params/canonical-manifest.ts for the projection).
import type { SignatureBlock } from "@/sdk/manifest";

export const PH_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-ph",
    keyId: "3c9bb31fa15de1c1d6574cd3ab5dc870",
    algorithm: "Ed25519",
    signature: "iYYWvaw63rQhJZiBsUFwS4JkgdonMVCL1iEX5iWtD8lugvsORNr7tetg+/LzDrDUPRByuTcclK+X0ZHzv0IMDg==",
    ts: "2026-07-31T00:00:00Z",
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: "3c7859a28db87704344b51db948376f9",
    algorithm: "Ed25519",
    signature: "FQLHWWkvC9JtwrpAmaIw5yRjUFmWcKxvJKllXliv8pUru+Kv+Tz7sWq7pK2j+hDyxNNIB9RJuRC3jCF3UUnyBw==",
    ts: "2026-07-31T00:00:00Z",
  },
};
