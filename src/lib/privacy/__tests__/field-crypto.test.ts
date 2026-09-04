// H23 Fase D — Field-level encryption contract.
import { describe, it, expect } from "vitest";
import {
  buildKeyRing,
  isSealedField,
  openMetadataField,
  openValue,
  parseFieldKey,
  rotateValue,
  sealMetadata,
  sealValue,
  FieldCryptoError,
} from "@/lib/privacy/field-crypto.server";
import { maskSensitive, sensitiveFieldsFor, ALL_SENSITIVE_KEYS } from "@/lib/privacy/sensitive-fields";

function keySpec(kid: string, seed: number): string {
  const bytes = new Uint8Array(32).map((_, i) => (i * 7 + seed) % 251);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return `${kid}:${btoa(s)}`;
}

const RING = buildKeyRing(keySpec("k1", 3));
const ROTATED = buildKeyRing(keySpec("k2", 11), [keySpec("k1", 3)]);

describe("field key parsing", () => {
  it("rejects a malformed spec", () => {
    expect(() => parseFieldKey("no-separator")).toThrow(FieldCryptoError);
  });

  it("rejects a key that is not 32 bytes", () => {
    expect(() => parseFieldKey(`short:${btoa("abc")}`)).toThrow(FieldCryptoError);
  });

  it("accepts a well-formed 32-byte key", () => {
    const key = parseFieldKey(keySpec("k1", 3));
    expect(key.kid).toBe("k1");
    expect(key.bytes.length).toBe(32);
  });
});

describe("seal / open round trip", () => {
  it("seals a NIK and reads it back", async () => {
    const sealed = await sealValue("3174012509900001", RING.primary);
    expect(isSealedField(sealed)).toBe(true);
    expect(JSON.stringify(sealed)).not.toContain("3174012509900001");
    expect(await openValue(sealed, RING)).toBe("3174012509900001");
  });

  it("produces a different ciphertext for the same input", async () => {
    const a = await sealValue("094512345678000", RING.primary);
    const b = await sealValue("094512345678000", RING.primary);
    expect(a.ct).not.toBe(b.ct);
    expect(a.iv).not.toBe(b.iv);
  });

  it("fails authentication when the ciphertext is tampered with", async () => {
    const sealed = await sealValue("3174012509900001", RING.primary);
    const flipped = sealed.ct.startsWith("A") ? "B" + sealed.ct.slice(1) : "A" + sealed.ct.slice(1);
    await expect(openValue({ ...sealed, ct: flipped }, RING)).rejects.toBeInstanceOf(
      FieldCryptoError,
    );
  });

  it("refuses to open under an unknown key id", async () => {
    const sealed = await sealValue("3174012509900001", RING.primary);
    await expect(openValue({ ...sealed, kid: "ghost" }, RING)).rejects.toBeInstanceOf(
      FieldCryptoError,
    );
  });
});

describe("key rotation", () => {
  it("still reads values sealed with a retired key", async () => {
    const old = await sealValue("bca-1234567890", RING.primary);
    expect(await openValue(old, ROTATED)).toBe("bca-1234567890");
  });

  it("re-seals under the primary key", async () => {
    const old = await sealValue("bca-1234567890", RING.primary);
    const fresh = await rotateValue(old, ROTATED);
    expect(fresh.kid).toBe("k2");
    expect(await openValue(fresh, ROTATED)).toBe("bca-1234567890");
  });

  it("is a no-op when the value is already under the primary key", async () => {
    const current = await sealValue("x", ROTATED.primary);
    expect(await rotateValue(current, ROTATED)).toBe(current);
  });
});

describe("metadata sealing", () => {
  const keys = sensitiveFieldsFor("ID").map((f) => f.key);

  it("seals only the sensitive keys and keeps the rest readable", async () => {
    const { metadata, sealedKeys } = await sealMetadata(
      { nik: "3174012509900001", npwp: "094512345678000", province: "DKI Jakarta" },
      keys,
      RING,
    );
    expect(sealedKeys.sort()).toEqual(["nik", "npwp"]);
    expect(metadata.province).toBe("DKI Jakarta");
    expect(isSealedField(metadata.nik)).toBe(true);
  });

  it("skips empty values and is idempotent", async () => {
    const first = await sealMetadata({ nik: "3174012509900001", npwp: "" }, keys, RING);
    const second = await sealMetadata(first.metadata, keys, RING);
    expect(second.metadata.nik).toEqual(first.metadata.nik);
    expect(second.metadata.npwp).toBe("");
  });

  it("reads legacy plaintext and flags it as not sealed", async () => {
    const opened = await openMetadataField({ nik: "3174012509900001" }, "nik", RING);
    expect(opened).toEqual({ key: "nik", value: "3174012509900001", wasSealed: false });
  });

  it("returns null when the field is absent", async () => {
    expect(await openMetadataField({}, "nik", RING)).toBeNull();
  });
});

describe("masking", () => {
  it("keeps only the tail visible", () => {
    expect(maskSensitive("3174012509900001", 4)).toBe("••••••••••••0001");
  });

  it("hides everything for short values", () => {
    expect(maskSensitive("123", 4)).toBe("•••");
  });

  it("declares the Indonesian sensitive set", () => {
    expect(ALL_SENSITIVE_KEYS).toEqual(expect.arrayContaining(["nik", "npwp", "bank_account"]));
  });
});
