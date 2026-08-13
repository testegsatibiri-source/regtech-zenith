// H11.1a — Dual-signature block for the Indonesia pack v1.9.0.
// Signatures were generated over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-id",
    keyId: "d86fbf3c326bcf49cc38309cf86504fc",
    algorithm: "Ed25519",
    signature: "HGTHBKXnUfCEgF8ObigVsggQZT6LUiXE2Gn7Xh8DpXYIfgNZ/dDZHWow+nn9WZYJXQdo5XbBP957UrdlYUfJAw==",
    ts: "2026-08-13T01:02:19Z",
  },
  countersign: {
    publisher: "platform-cto-id",
    keyId: "5f1e549effaeb382d9042778f5201fcd",
    algorithm: "Ed25519",
    signature: "NbKo1LzPOIv2ESIAqlOwl0gJ0svMowrdwZbJ0WUWcW3ZBI1o2waYDaJOVLYUzUTBcjJBrc98jaj1ECbULMrLBA==",
    ts: "2026-08-13T01:02:19Z",
  },
};
