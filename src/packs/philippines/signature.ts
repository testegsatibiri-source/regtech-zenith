// H21 Phase 4 — Dual-signature block for the Philippines pack v1.3.0 (PH-2024.3).
// Signatures are computed over the canonical manifest bytes
// (country, name, currency, version, rulesetVersion, interfaceVersion,
// commercialReady) — see @/packs/indonesia/params/canonical-manifest.
// Any ruleset, version or commercialReady bump invalidates them and REQUIRES
// re-signing (regression guarded by src/packs/__tests__/signature-tamper.test.ts).
import type { SignatureBlock } from "@/sdk/manifest";

export const PH_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-ph",
    keyId: "d3f0de34370b62d77212960fec901534",
    algorithm: "Ed25519",
    signature: "+f4vVHZcwhxLwS3kxIVJg7i2o8Vowig4Vi03ZhFC+TkSN76TUVUZXRevseKmGvo0ufF+EOZXnVYZA5Nb25xRCQ==",
    ts: "2026-08-18T00:00:00Z",
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: "6d1ebeee27ec6a3ebed1a6cd7f5b6e96",
    algorithm: "Ed25519",
    signature: "HOUtWQqO3O3PfPJp/DOHfQPk4iaVwwnQWUAkESPORSqzcG3+CG3WKF6+5XJTgGiJwYjCYHo+YXxUdA6EBP28AQ==",
    ts: "2026-08-18T00:00:00Z",
  },
};
