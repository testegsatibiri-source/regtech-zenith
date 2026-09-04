// H23 Fase D — Projection of employee sensitive fields for the wire.
// The client never receives a ciphertext envelope nor a full identifier: it
// gets a mask plus the sealing status. Revelation goes through an audited
// server function.
import {
  isSealedField,
  type KeyRing,
  openValue,
  type SealedField,
} from "@/lib/privacy/field-crypto.server";
import {
  maskSensitive,
  sensitiveFieldsFor,
  type MaskedField,
  type SensitiveFieldSpec,
} from "@/lib/privacy/sensitive-fields";

function maskFromSealed(sealed: SealedField, spec: SensitiveFieldSpec): string {
  const width = sealed.len ?? 12;
  const hint = sealed.hint ?? "";
  const dots = Math.max(4, width - hint.length);
  return "•".repeat(dots) + hint.slice(-spec.revealTail);
}

export interface MaskedEmployee {
  country_metadata: Record<string, unknown>;
  sensitive_fields: MaskedField[];
  [k: string]: unknown;
}

/**
 * Replaces every sensitive value with a mask. Legacy plaintext is masked too,
 * and reported with `sealed: false` so the migration report can find it.
 */
export function maskEmployeeRow<T extends { country_metadata: unknown }>(
  row: T,
  countryCode: string | null | undefined,
): T & { sensitive_fields: MaskedField[] } {
  const specs = sensitiveFieldsFor(countryCode);
  const metadata = { ...((row.country_metadata ?? {}) as Record<string, unknown>) };
  const fields: MaskedField[] = [];

  for (const spec of specs) {
    const value = metadata[spec.key];
    if (isSealedField(value)) {
      const masked = maskFromSealed(value, spec);
      metadata[spec.key] = masked;
      fields.push({ key: spec.key, masked, sealed: true, present: true });
    } else if (typeof value === "string" && value.trim() !== "") {
      const masked = maskSensitive(value, spec.revealTail);
      metadata[spec.key] = masked;
      fields.push({ key: spec.key, masked, sealed: false, present: true });
    } else {
      fields.push({ key: spec.key, masked: "", sealed: false, present: false });
    }
  }

  return { ...row, country_metadata: metadata, sensitive_fields: fields };
}

/** Counts values still stored as plaintext (migration report input). */
export function countPlaintextFields(
  metadata: Record<string, unknown>,
  countryCode: string | null | undefined,
): string[] {
  return sensitiveFieldsFor(countryCode)
    .filter((spec) => {
      const value = metadata[spec.key];
      return typeof value === "string" && value.trim() !== "";
    })
    .map((spec) => spec.key);
}

/** Opens one field for an explicit, audited reveal. */
export async function revealField(
  metadata: Record<string, unknown>,
  key: string,
  ring: KeyRing,
): Promise<{ value: string; sealed: boolean } | null> {
  const value = metadata[key];
  if (isSealedField(value)) return { value: await openValue(value, ring), sealed: true };
  if (typeof value === "string" && value.trim() !== "") return { value: value.trim(), sealed: false };
  return null;
}
