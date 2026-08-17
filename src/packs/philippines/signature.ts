// H21 Phase 3 — Dual-signature block for the Philippines pack v1.2.0 (PH-2024.3).
// Signatures are computed over the canonical manifest bytes
// (country, name, currency, version, rulesetVersion, interfaceVersion,
// commercialReady) — see @/packs/indonesia/params/canonical-manifest.
// Any ruleset or commercialReady bump invalidates them and REQUIRES re-signing
// (regression guarded by src/packs/__tests__/signature-tamper.test.ts).
import type { SignatureBlock } from "@/sdk/manifest";

export const PH_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-ph",
    keyId: "4e81a7599927b5ff6c1988566bc6eae8",
    algorithm: "Ed25519",
    signature: "X3+z+C56lnsOYpshqj7qjQ6T6m2AB2wMuxwnqxj58Kc4jOgKH994fmmLiZbrShFEpwaKj2aRT6a7RUb9vAAQAQ==",
    ts: "2026-08-17T00:00:00Z",
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: "6eb0e2a0d8ab9fa7f979f57727f51f4b",
    algorithm: "Ed25519",
    signature: "aoCAbk93EDhCqFojO1/Pd0lzxLL1mSUYtl6kx64ZoT/gqP+HPwC5SZUPbbu92UQth/5YNbTqaUw4HM8x2R/hAQ==",
    ts: "2026-08-17T00:00:00Z",
  },
};
