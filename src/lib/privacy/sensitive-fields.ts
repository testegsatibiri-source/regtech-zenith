// H23 Fase D — Sensitive personal-data fields per jurisdiction.
// Client-safe: contains no keys and no crypto. The list below drives what is
// sealed at rest, masked on the wire and revealed only through an audited
// server function.
//
// Indonesia — UU 27/2022 (PDP) treats national identification numbers as
// personal data with stricter handling duties; NPWP (tax ID) and bank account
// data carry direct financial-fraud exposure.

export interface SensitiveFieldSpec {
  /** Key inside `employees.country_metadata`. */
  key: string;
  /** Human label (EN) for UI and audit trail. */
  label: string;
  /** Legal reference driving the classification. */
  legalBasis: string;
  /** How many trailing characters stay visible in the mask. */
  revealTail: number;
}

const ID_FIELDS: SensitiveFieldSpec[] = [
  {
    key: "nik",
    label: "NIK (national ID)",
    legalBasis: "UU 27/2022 art. 4 — data identifikasi pribadi",
    revealTail: 4,
  },
  {
    key: "npwp",
    label: "NPWP (tax ID)",
    legalBasis: "UU 27/2022 art. 4; UU KUP art. 34 (kerahasiaan)",
    revealTail: 3,
  },
  {
    key: "bank_account",
    label: "Bank account",
    legalBasis: "UU 27/2022 art. 4 huruf f — data keuangan pribadi",
    revealTail: 4,
  },
  {
    key: "bank_account_number",
    label: "Bank account number",
    legalBasis: "UU 27/2022 art. 4 huruf f — data keuangan pribadi",
    revealTail: 4,
  },
];

const PH_FIELDS: SensitiveFieldSpec[] = [
  { key: "tin", label: "TIN", legalBasis: "RA 10173 sec. 3(l)", revealTail: 3 },
  { key: "sss", label: "SSS number", legalBasis: "RA 10173 sec. 3(l)", revealTail: 3 },
  {
    key: "bank_account",
    label: "Bank account",
    legalBasis: "RA 10173 sec. 3(l)",
    revealTail: 4,
  },
];

const BY_COUNTRY: Record<string, SensitiveFieldSpec[]> = {
  ID: ID_FIELDS,
  PH: PH_FIELDS,
};

/** Union of every sensitive key across jurisdictions. */
export const ALL_SENSITIVE_KEYS: string[] = Array.from(
  new Set(Object.values(BY_COUNTRY).flatMap((specs) => specs.map((s) => s.key))),
);

export function sensitiveFieldsFor(countryCode: string | null | undefined): SensitiveFieldSpec[] {
  return BY_COUNTRY[(countryCode ?? "").toUpperCase()] ?? [];
}

export function sensitiveFieldSpec(
  countryCode: string | null | undefined,
  key: string,
): SensitiveFieldSpec | undefined {
  return sensitiveFieldsFor(countryCode).find((s) => s.key === key);
}

/** `3174xxxxxxxx1234` → `••••••••1234`. Never returns the full value. */
export function maskSensitive(value: string, revealTail = 4): string {
  const clean = value.trim();
  if (!clean) return "";
  if (clean.length <= revealTail) return "•".repeat(clean.length);
  return "•".repeat(Math.max(4, clean.length - revealTail)) + clean.slice(-revealTail);
}

/** Shape returned to the client instead of the raw value. */
export interface MaskedField {
  key: string;
  masked: string;
  /** false ⇒ still stored as plaintext and pending migration. */
  sealed: boolean;
  present: boolean;
}
