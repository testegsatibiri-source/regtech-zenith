// H17 — Dual-signature block for the Philippines pack v1.0.0.
// Signatures were generated over the canonical manifest bytes (now including
// the H20 commercialReady field); kept in a separate module so validators/tests
// can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const PH_SIGNATURE_BLOCK: SignatureBlock = {
  author: {
    publisher: "uboard-ph",
    keyId: "865aa02c49c9c83e9d0f6e1767e6209c",
    algorithm: "Ed25519",
    signature: "4YoeCdN/XbhdZDZ9WSWhxFpgdyDZN60gSvvn579VuYsjhz1xyYZLG6ZfL69AbcSrrNy3jnqK0aULipL61x9qAw==",
    ts: "2026-08-13T01:02:19Z",
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: "e32e5dcca6ea0d1c18ac27043eb6ae6e",
    algorithm: "Ed25519",
    signature: "85FXunvGSe8b3qgqsvhTmCCZI9b94rvm1KfMz3kQntNH66sV58WgHlwFJCmVfGcYo0J+FoKsD5lYRKxa0ZVwDA==",
    ts: "2026-08-13T01:02:19Z",
  },
};
