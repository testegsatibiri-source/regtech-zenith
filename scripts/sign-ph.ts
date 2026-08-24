import { generateKeyPairSync, sign } from "node:crypto";
import { canonicalManifestBytes } from "../src/packs/indonesia/params/canonical-manifest";
import type { CountryManifest } from "../src/sdk/manifest";

function exportRawPublicKey(publicKey: any): string {
  const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  return spki.slice(-32).toString("base64");
}

function signBytes(bytes: Uint8Array, privateKey: any): string {
  return sign(null, bytes, privateKey).toString("base64");
}

function keyId(publicKeyB64: string): string {
  return Buffer.from(publicKeyB64, "base64").toString("hex");
}

const manifest: CountryManifest = {
  country: "PH",
  name: "Philippines",
  currency: "PHP",
  version: "1.4.0",
  rulesetVersion: "PH-2024.4",
  interfaceVersion: "1.0.0",
  engines: ["payroll", "tax", "benefits", "thirteenth", "calendar", "contracts", "audit", "rules", "filings", "separation"],
  provides: ["payroll", "tax", "benefits", "thirteenth", "calendar", "contracts", "audit", "rules", "filings", "separation"],
  requires: [],
  events: {
    emits: ["PayrollCalculated@1", "PayrollFinalized@1", "TaxCalculated@1"],
    consumes: ["EmployeeUpserted@1", "ObligationStatusChanged@1"],
  },
  permissions: ["employees.read", "payroll.write"],
  features: ["train-law", "13th-month", "sss", "philhealth", "pagibig", "offboarding"],
  supportedLanguages: ["en"],
  requiresCore: ">=2.0.0",
  commercialReady: false,
  signatureBlock: undefined as any,
};

const bytes = canonicalManifestBytes(manifest);

const author = generateKeyPairSync("ed25519");
const countersign = generateKeyPairSync("ed25519");

const authorPub = exportRawPublicKey(author.publicKey);
const countersignPub = exportRawPublicKey(countersign.publicKey);

const block = {
  author: {
    publisher: "uboard-ph",
    keyId: keyId(authorPub),
    algorithm: "Ed25519",
    signature: signBytes(bytes, author.privateKey),
    ts: new Date().toISOString().replace(/\.[0-9]{3}Z/, "Z"),
  },
  countersign: {
    publisher: "platform-cto-ph",
    keyId: keyId(countersignPub),
    algorithm: "Ed25519",
    signature: signBytes(bytes, countersign.privateKey),
    ts: new Date().toISOString().replace(/\.[0-9]{3}Z/, "Z"),
  },
};

console.log("// === PH v1.4.0 signature block ===");
console.log(JSON.stringify(block, null, 2));
console.log("\n// === Trust store public keys (INSERT or UPDATE) ===");
console.log(`-- author: uboard-ph, keyId=${block.author.keyId}`);
console.log(`INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id) VALUES (gen_random_uuid(), 'uboard-ph', '${authorPub}', 'ed25519', ARRAY['sign']::text[], 'db', true, '${block.author.keyId}');`);
console.log(`-- countersign: platform-cto-ph, keyId=${block.countersign.keyId}`);
console.log(`INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id) VALUES (gen_random_uuid(), 'platform-cto-ph', '${countersignPub}', 'ed25519', ARRAY['sign']::text[], 'db', true, '${block.countersign.keyId}');`);
