// H22 Phase A — Dual-signature block for the Philippines pack v1.4.0 (PH-2024.4).
// Signatures are computed over the canonical manifest bytes
// (country, name, currency, version, rulesetVersion, interfaceVersion,
// commercialReady) — see @/packs/indonesia/params/canonical-manifest.
// Any ruleset, version or commercialReady bump invalidates them and REQUIRES
// re-signing (regression guarded by src/packs/__tests__/signature-tamper.test.ts).
import type { SignatureBlock } from "@/sdk/manifest";

export const PH_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-ph",
    keyId: "ead45d8f7d2068cbdb1c1708ade9dd231523a426c39c5fcc84718a4444f0babd",
    algorithm: "Ed25519",
    signature: "rfbQm4Y3N9URZGbkwG7qAtXMD/RC+JuRj1OC8Ve3Gf6h/QhNyjFeFtnrK6W5wWUR4KePVkqwhgqq/dJ+FiPkBw==",
    ts: "2026-08-24T11:50:13Z",
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: "40951ab0622cfe14259fc5c38bcf8c27ea618ea85e4273c7a6db9cb2e09e86b7",
    algorithm: "Ed25519",
    signature: "D3mEaxmkWKqwvMgwnUF+CgiOFf34/cX3fCMrTaif8yf5oQ5CFutPix0b9GnVRTM1n2u4eS8km3P0nvGBlxA/DA==",
    ts: "2026-08-24T11:50:13Z",
  },
};
