// H22 Phase B — Dual-signature block for the Philippines pack v1.5.0 (PH-2024.5).
// Signatures are computed over the canonical manifest bytes
// (country, name, currency, version, rulesetVersion, interfaceVersion,
// commercialReady) — see @/packs/indonesia/params/canonical-manifest.
// Any ruleset, version or commercialReady bump invalidates them and REQUIRES
// re-signing (regression guarded by src/packs/__tests__/signature-tamper.test.ts).
import type { SignatureBlock } from "@/sdk/manifest";

export const PH_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-ph",
    keyId: "4151e9a57e6ee64a5ce0511070419e63cccce6c193bb032031de19621b6baa79",
    algorithm: "Ed25519",
    signature: "mjTdKmhhkD/jmFcI/N5D07bnreqpTFgomlWEuru4SF9LnFS7NtRtmFYy5m2OF2Vd8ZnxGSntd07MgdXY89EBCQ==",
    ts: "2026-08-25T01:32:34Z",
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: "1a441188c852aa95a0a8785630070ced188d00ba51ccbfc07690208ecefa4ea0",
    algorithm: "Ed25519",
    signature: "qD8ycEfJRkw5EIfIv1kZJ0pWnVTIYLgo70Bw0MTXMddJjTaqZXBymAfEwSmT10BdqIPS+0KedpfxD7uc9tsODw==",
    ts: "2026-08-25T01:32:34Z",
  },
};
