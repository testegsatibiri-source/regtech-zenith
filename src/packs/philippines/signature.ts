// H24 Etapa A — Dual-signature block for the Philippines pack v1.7.0 (PH-2025.1).
// Re-signed 2026-09-23 after the DEBT-030 (SSS Circular 2024-006) and DEBT-031
// (Wage Order NCR-28) statutory corrections.
// Signatures are computed over the canonical manifest bytes
// (country, name, currency, version, rulesetVersion, interfaceVersion,
// commercialReady) — see @/packs/indonesia/params/canonical-manifest.
// Any ruleset, version or commercialReady bump invalidates them and REQUIRES
// re-signing (regression guarded by src/packs/__tests__/signature-tamper.test.ts).
import type { SignatureBlock } from "@/sdk/manifest";

export const PH_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-ph",
    keyId: "2ebf509a713b5a4f6a5c5b3666c59d50dba610ddf15a2f812384a42ec77a0a5f",
    algorithm: "Ed25519",
    signature:
      "pvWRX7TIYDCUQK7cVAXO9eR38HwF4fOoDZE/x2lsExXcJxNlZoj8+i2q106ShGPoXdnaFbbyoq6lQGz2bYPhDw==",
    ts: "2026-09-23T01:02:33Z",
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: "fc56acd8873fc3599e63232d41e4ade1943b1f6e68e6179336bd52d090872964",
    algorithm: "Ed25519",
    signature:
      "ii1AE9CshYwf4EIzcXpJTlo1Gi8Owh37YBrzuE1Bvg0IqFU5nCx8A5ub/rMyLfp34o6qjKaylWIO/qhjGTqRCQ==",
    ts: "2026-09-23T01:02:33Z",
  },
};
