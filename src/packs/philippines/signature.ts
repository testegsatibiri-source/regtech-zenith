// H22 Phase C — Dual-signature block for the Philippines pack v1.6.0 (PH-2024.6).
// Signatures are computed over the canonical manifest bytes
// (country, name, currency, version, rulesetVersion, interfaceVersion,
// commercialReady) — see @/packs/indonesia/params/canonical-manifest.
// Any ruleset, version or commercialReady bump invalidates them and REQUIRES
// re-signing (regression guarded by src/packs/__tests__/signature-tamper.test.ts).
import type { SignatureBlock } from "@/sdk/manifest";

export const PH_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-ph",
    keyId: "b12f6ea4fd9e5a9157a4532754ecc89a4c79ec548ed53eae6308ec074a082432",
    algorithm: "Ed25519",
    signature: "BFDLfGFWVMykPu0cHydyFaK5fqB+87glzY0dvWllYyGB7muT9LQztfKBOaBEYsTXt88t3lGkmX8f274Ypb3jCg==",
    ts: "2026-08-28T00:15:21Z",
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: "e9aad9de922b46539a0ea9e7674f37b218dba8ce1b61c5272155331b0fd94e93",
    algorithm: "Ed25519",
    signature: "pDweqG1vF02qzvms3pr460lKvYDKTRzc4eaYWta/qf6fOWrrMR6D7kkRdAHghEZ3EWRxGHv6XP0TOESq5mxNBQ==",
    ts: "2026-08-28T00:15:21Z",
  },
};
