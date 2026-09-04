// H23 Fase D — Field-level encryption for sensitive personal data.
// AES-256-GCM through Web Crypto (available in the Worker runtime). The key
// never lives in the database: it is supplied as an environment secret and
// read inside the server-function handler.
//
// Envelope stored in place of the plaintext value:
//   { v: 1, alg: "AES-GCM", kid: "<key id>", iv: "<b64>", ct: "<b64>" }
//
// `kid` allows rotation: new writes use the primary key, reads try the whole
// key ring. Values still stored as plaintext are accepted on read and flagged
// as pending migration — never silently treated as sealed.

export const FIELD_ENVELOPE_VERSION = 1 as const;

export interface SealedField {
  v: typeof FIELD_ENVELOPE_VERSION;
  alg: "AES-GCM";
  kid: string;
  iv: string;
  ct: string;
}

export interface FieldKey {
  kid: string;
  bytes: Uint8Array;
}

export class FieldCryptoError extends Error {}

// ------------------------------------------------------------------ encoding

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------------------------------------------------------------- key ring

/**
 * Parses `kid:base64key`. The key must decode to exactly 32 bytes (AES-256).
 */
export function parseFieldKey(spec: string): FieldKey {
  const trimmed = spec.trim();
  const sep = trimmed.indexOf(":");
  if (sep <= 0) {
    throw new FieldCryptoError("Field key must be formatted as '<kid>:<base64 32-byte key>'.");
  }
  const kid = trimmed.slice(0, sep).trim();
  let bytes: Uint8Array;
  try {
    bytes = fromBase64(trimmed.slice(sep + 1).trim());
  } catch {
    throw new FieldCryptoError("Field key material is not valid base64.");
  }
  if (bytes.length !== 32) {
    throw new FieldCryptoError(`Field key must be 32 bytes (got ${bytes.length}).`);
  }
  return { kid, bytes };
}

export interface KeyRing {
  primary: FieldKey;
  all: FieldKey[];
}

export function buildKeyRing(primarySpec: string, previousSpecs: string[] = []): KeyRing {
  const primary = parseFieldKey(primarySpec);
  const all = [primary];
  for (const spec of previousSpecs) {
    if (!spec.trim()) continue;
    const key = parseFieldKey(spec);
    if (!all.some((k) => k.kid === key.kid)) all.push(key);
  }
  return { primary, all };
}

/**
 * Reads the key ring from the environment. MUST be called inside a handler.
 * `ID_PDP_FIELD_KEY` = "<kid>:<base64>", `ID_PDP_FIELD_KEY_PREVIOUS` = comma
 * separated list of retired keys kept for decryption during rotation.
 */
export function loadKeyRing(): KeyRing {
  const primary = process.env["ID_PDP_FIELD_KEY"];
  if (!primary) {
    throw new FieldCryptoError(
      "ID_PDP_FIELD_KEY is not configured — sensitive fields cannot be sealed.",
    );
  }
  const previous = (process.env["ID_PDP_FIELD_KEY_PREVIOUS"] ?? "").split(",").filter(Boolean);
  return buildKeyRing(primary, previous);
}

export function keyRingAvailable(): boolean {
  return Boolean(process.env["ID_PDP_FIELD_KEY"]);
}

async function importKey(key: FieldKey, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", key.bytes as BufferSource, { name: "AES-GCM" }, false, [
    usage,
  ]);
}

// ------------------------------------------------------------------ envelope

export function isSealedField(value: unknown): value is SealedField {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<SealedField>;
  return (
    v.v === FIELD_ENVELOPE_VERSION &&
    v.alg === "AES-GCM" &&
    typeof v.kid === "string" &&
    typeof v.iv === "string" &&
    typeof v.ct === "string"
  );
}

export async function sealValue(plaintext: string, key: FieldKey): Promise<SealedField> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await importKey(key, "encrypt");
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    cryptoKey,
    new TextEncoder().encode(plaintext) as BufferSource,
  );
  return {
    v: FIELD_ENVELOPE_VERSION,
    alg: "AES-GCM",
    kid: key.kid,
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ct)),
  };
}

export async function openValue(sealed: SealedField, ring: KeyRing): Promise<string> {
  const key = ring.all.find((k) => k.kid === sealed.kid);
  if (!key) {
    throw new FieldCryptoError(
      `No key in the ring matches key id '${sealed.kid}' — rotation left a gap.`,
    );
  }
  const cryptoKey = await importKey(key, "decrypt");
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(sealed.iv) as BufferSource },
      cryptoKey,
      fromBase64(sealed.ct) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new FieldCryptoError("Sealed value failed authentication — data or key is corrupt.");
  }
}

/** Re-seals a value under the primary key (used by rotation). */
export async function rotateValue(sealed: SealedField, ring: KeyRing): Promise<SealedField> {
  if (sealed.kid === ring.primary.kid) return sealed;
  return sealValue(await openValue(sealed, ring), ring.primary);
}

// ------------------------------------------------------- record-level helpers

export interface SealRecordResult {
  metadata: Record<string, unknown>;
  sealedKeys: string[];
}

/**
 * Seals the listed keys of a metadata object. Values already sealed are kept
 * as-is; empty values are left untouched.
 */
export async function sealMetadata(
  metadata: Record<string, unknown>,
  keys: string[],
  ring: KeyRing,
): Promise<SealRecordResult> {
  const out: Record<string, unknown> = { ...metadata };
  const sealedKeys: string[] = [];
  for (const key of keys) {
    const value = out[key];
    if (isSealedField(value)) {
      sealedKeys.push(key);
      continue;
    }
    if (typeof value !== "string" || value.trim() === "") continue;
    out[key] = await sealValue(value.trim(), ring.primary);
    sealedKeys.push(key);
  }
  return { metadata: out, sealedKeys };
}

export interface OpenedField {
  key: string;
  value: string;
  wasSealed: boolean;
}

/** Reads one field, tolerating legacy plaintext. */
export async function openMetadataField(
  metadata: Record<string, unknown>,
  key: string,
  ring: KeyRing,
): Promise<OpenedField | null> {
  const value = metadata[key];
  if (isSealedField(value)) {
    return { key, value: await openValue(value, ring), wasSealed: true };
  }
  if (typeof value === "string" && value.trim() !== "") {
    return { key, value: value.trim(), wasSealed: false };
  }
  return null;
}
