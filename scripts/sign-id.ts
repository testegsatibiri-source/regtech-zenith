// Versioned, reproducible signing script for the Indonesia Country Pack.
//
// Replaces the throwaway /tmp script used through H23. Two modes:
//
//   1. Custody mode (REQUIRED for staging/production)
//      Provide existing Ed25519 private keys as base64 PKCS#8 via env:
//        ID_PACK_KEY_AUTHOR       — publisher "uboard-id"
//        ID_PACK_KEY_COUNTERSIGN  — publisher "platform-cto-id"
//      The public keys (and therefore the trust-store rows) stay stable across
//      re-signings, so a version bump does NOT require rotating keys in
//      public.pack_signing_keys.
//
//   2. Bootstrap mode (local/dev only)
//      With no env keys, a fresh key pair is generated and printed, INCLUDING
//      the private keys, so they can be moved into your secret vault. Every
//      bootstrap invalidates the previously stored trust-store rows.
//
// Usage:
//   bun run scripts/sign-id.ts            # print block, do not write
//   bun run scripts/sign-id.ts --write    # also rewrite src/packs/indonesia/signature.ts
//
// Generate a custody key pair once:
//   bun run scripts/sign-id.ts --new-keys
import { generateKeyPairSync, sign, createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalManifestBytes } from "../src/packs/indonesia/params/canonical-manifest";
import type { CountryManifest } from "../src/sdk/manifest";

// ---------------------------------------------------------------------------
// Manifest projection — MUST match src/packs/indonesia/index.ts exactly.
// Only the canonical signable fields matter (see canonical-manifest.ts).
// ---------------------------------------------------------------------------
const MANIFEST_PATH = path.join(import.meta.dir, "../src/packs/indonesia/index.ts");
const SIGNATURE_PATH = path.join(import.meta.dir, "../src/packs/indonesia/signature.ts");

const SRC = fs.readFileSync(MANIFEST_PATH, "utf8");

// Only the top-level `const manifest: CountryManifest = { ... }` literal is
// authoritative — capability descriptors further down also carry `version`.
const MANIFEST_BLOCK = (() => {
  const m = SRC.match(/const manifest: CountryManifest = \{([\s\S]*?)\n\};/);
  if (!m) throw new Error(`manifest literal not found in ${MANIFEST_PATH}`);
  return m[1];
})();

function readFromManifest(key: string): string {
  const direct = MANIFEST_BLOCK.match(new RegExp(`^\\s*${key}:\\s*"([^"]+)"`, "m"));
  if (direct) return direct[1];
  const viaConst = MANIFEST_BLOCK.match(new RegExp(`^\\s*${key}:\\s*([A-Z_]+),`, "m"));
  if (viaConst) {
    const value = SRC.match(new RegExp(`const ${viaConst[1]} = "([^"]+)"`));
    if (value) return value[1];
  }
  throw new Error(`Could not read ${key} from ${MANIFEST_PATH}`);
}

function readBoolFromManifest(key: string): boolean {
  const m = MANIFEST_BLOCK.match(new RegExp(`^\\s*${key}:\\s*(true|false)`, "m"));
  if (!m) throw new Error(`Could not read ${key} from ${MANIFEST_PATH}`);
  return m[1] === "true";
}

const manifest = {
  country: "ID",
  name: readFromManifest("name"),
  currency: readFromManifest("currency"),
  version: readFromManifest("version"),
  rulesetVersion: readFromManifest("rulesetVersion"),
  interfaceVersion: readFromManifest("interfaceVersion"),
  commercialReady: readBoolFromManifest("commercialReady"),
} as CountryManifest;

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
function exportRawPublicKey(publicKey: KeyObject): string {
  const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  return spki.subarray(-32).toString("base64");
}

function exportPrivateKeyB64(privateKey: KeyObject): string {
  return (privateKey.export({ type: "pkcs8", format: "der" }) as Buffer).toString("base64");
}

function loadPrivateKey(envName: string): KeyObject | null {
  const raw = process.env[envName];
  if (!raw) return null;
  return createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" });
}

function derivePublicKey(privateKey: KeyObject): KeyObject {
  // node:crypto derives the public key directly from the private key object.
  return createPublicKey(privateKey);
}

// `keyId` is the trust-store lookup handle. It is derived from the public key
// so it is stable and verifiable — never random.
function keyIdFor(publicKeyB64: string): string {
  return Buffer.from(publicKeyB64, "base64").subarray(0, 16).toString("base64");
}

if (process.argv.includes("--new-keys")) {
  const a = generateKeyPairSync("ed25519");
  const c = generateKeyPairSync("ed25519");
  console.log("# Store these in your secret vault. They are NOT recoverable.");
  console.log(`ID_PACK_KEY_AUTHOR=${exportPrivateKeyB64(a.privateKey)}`);
  console.log(`ID_PACK_KEY_COUNTERSIGN=${exportPrivateKeyB64(c.privateKey)}`);
  console.log("\n# Matching public keys (trust store):");
  console.log(`author      public_key=${exportRawPublicKey(a.publicKey)}`);
  console.log(`countersign public_key=${exportRawPublicKey(c.publicKey)}`);
  process.exit(0);
}

const authorPriv = loadPrivateKey("ID_PACK_KEY_AUTHOR");
const counterPriv = loadPrivateKey("ID_PACK_KEY_COUNTERSIGN");
const custody = Boolean(authorPriv && counterPriv);

if (!custody && (authorPriv || counterPriv)) {
  throw new Error("Provide BOTH ID_PACK_KEY_AUTHOR and ID_PACK_KEY_COUNTERSIGN, or neither.");
}

const authorPair = authorPriv
  ? { privateKey: authorPriv, publicKey: derivePublicKey(authorPriv) }
  : generateKeyPairSync("ed25519");
const counterPair = counterPriv
  ? { privateKey: counterPriv, publicKey: derivePublicKey(counterPriv) }
  : generateKeyPairSync("ed25519");

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------
const bytes = canonicalManifestBytes(manifest);
const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

const authorPub = exportRawPublicKey(authorPair.publicKey);
const counterPub = exportRawPublicKey(counterPair.publicKey);

const block = {
  author: {
    publisher: "uboard-id",
    keyId: keyIdFor(authorPub),
    algorithm: "Ed25519",
    signature: sign(null, bytes, authorPair.privateKey).toString("base64"),
    ts,
  },
  countersign: {
    publisher: "platform-cto-id",
    keyId: keyIdFor(counterPub),
    algorithm: "Ed25519",
    signature: sign(null, bytes, counterPair.privateKey).toString("base64"),
    ts,
  },
};

console.log(`// mode: ${custody ? "CUSTODY (keys from env)" : "BOOTSTRAP (fresh keys generated)"}`);
console.log(`// manifest: ID v${manifest.version} / ${manifest.rulesetVersion}`);
console.log(JSON.stringify(block, null, 2));

if (!custody) {
  console.log("\n// !! Fresh keys — store the private keys before discarding this output:");
  console.log(`ID_PACK_KEY_AUTHOR=${exportPrivateKeyB64(authorPair.privateKey)}`);
  console.log(`ID_PACK_KEY_COUNTERSIGN=${exportPrivateKeyB64(counterPair.privateKey)}`);
  console.log("\n-- Trust store rotation (only needed when keys change):");
  console.log(`UPDATE public.pack_signing_keys SET active = false WHERE publisher IN ('uboard-id','platform-cto-id');`);
  console.log(
    `INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id) VALUES (gen_random_uuid(), 'uboard-id', '${authorPub}', 'ed25519', ARRAY['sign']::text[], 'db', true, '${block.author.keyId}');`,
  );
  console.log(
    `INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id) VALUES (gen_random_uuid(), 'platform-cto-id', '${counterPub}', 'ed25519', ARRAY['sign']::text[], 'db', true, '${block.countersign.keyId}');`,
  );
}

if (process.argv.includes("--write")) {
  const file = `// H11.1a — Dual-signature block for the Indonesia pack ${manifest.version}.
// Generated by scripts/sign-id.ts over the canonical manifest bytes; kept in a
// separate module so validators/tests can import without pulling the pack.
import type { SignatureBlock } from "@/sdk/manifest";

export const ID_SIGNATURE_BLOCK: SignatureBlock = ${JSON.stringify(block, null, 2)};
`;
  fs.writeFileSync(SIGNATURE_PATH, file);
  console.log(`\n// wrote ${SIGNATURE_PATH}`);
}
