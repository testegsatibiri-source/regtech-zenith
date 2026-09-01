// H19 — Presentation terminology per Country Pack.
// Keeps the workspace UI free of hardcoded Indonesian vocabulary: every label
// is resolved from the company's active jurisdiction, with a neutral fallback
// for packs that have not declared their own wording yet.

export interface IdentifierField {
  /** Key inside employees.country_metadata */
  key: string;
  label: string;
}

export interface PackTerminology {
  /** Statutory minimum wage label (UMP, Minimum Wage, ...) */
  minimumWage: string;
  /** Personal tax identifier (NPWP, TIN, ...) */
  taxId: string;
  /** Social security scheme umbrella (BPJS, SSS/PhilHealth, ...) */
  socialSecurity: string;
  /** Tax/marital status label (PTKP, Tax status, ...) */
  taxStatus: string;
  /** Statutory bonus (THR, 13th month pay, ...) */
  bonus: string;
  /** Country metadata inputs shown on the employee form. */
  identifiers: IdentifierField[];
  /** Employer registration inputs shown on the company registry page. */
  employerIdentifiers: IdentifierField[];
  /** Obligation category labels for the regulatory calendar. */
  categories: { tax: string; social: string; labor: string; other: string };
}

const GENERIC: PackTerminology = {
  minimumWage: "Minimum wage",
  taxId: "Tax ID",
  socialSecurity: "Social security",
  taxStatus: "Tax status",
  bonus: "Statutory bonus",
  identifiers: [
    { key: "national_id", label: "National ID" },
    { key: "tax_id", label: "Tax ID" },
    { key: "social_security_id", label: "Social security ID" },
  ],
  employerIdentifiers: [
    { key: "tax_id", label: "Employer tax ID" },
    { key: "social_security_id", label: "Employer social security ID" },
  ],
  categories: { tax: "Tax", social: "Social security", labor: "Labor", other: "Other" },
};

const BY_COUNTRY: Record<string, PackTerminology> = {
  ID: {
    minimumWage: "UMP",
    taxId: "NPWP",
    socialSecurity: "BPJS",
    taxStatus: "PTKP",
    bonus: "THR",
    identifiers: [
      { key: "nik", label: "NIK" },
      { key: "npwp", label: "NPWP" },
      { key: "bpjs_kesehatan", label: "BPJS Kesehatan" },
      { key: "bpjs_ketenagakerjaan", label: "BPJS Ketenagakerjaan" },
    ],
    employerIdentifiers: [
      { key: "npwp", label: "NPWP Perusahaan" },
      { key: "bpjs_kesehatan", label: "BPJS Kesehatan employer no." },
      { key: "bpjs_ketenagakerjaan", label: "BPJS Ketenagakerjaan employer no." },
    ],
    categories: { tax: "Tax (DJP)", social: "BPJS", labor: "Labor (Kemnaker)", other: "Other" },
  },
  PH: {
    minimumWage: "Regional minimum wage",
    taxId: "TIN",
    socialSecurity: "SSS / PhilHealth / Pag-IBIG",
    taxStatus: "Tax status",
    bonus: "13th month pay",
    identifiers: [
      { key: "tin", label: "TIN" },
      { key: "sss", label: "SSS number" },
      { key: "philhealth", label: "PhilHealth number" },
      { key: "pagibig", label: "Pag-IBIG number" },
    ],
    employerIdentifiers: [
      { key: "tin", label: "Employer TIN (9 or 12 digits, incl. branch code)" },
      { key: "rdo", label: "BIR RDO code (3 digits)" },
      { key: "sss", label: "SSS employer number (10 digits)" },
      { key: "philhealth", label: "PhilHealth employer number / PEN (12 digits)" },
      { key: "pagibig", label: "Pag-IBIG employer ID (12 digits)" },
    ],
    categories: {
      tax: "Tax (BIR)",
      social: "SSS / PhilHealth",
      labor: "Labor (DOLE)",
      other: "Other",
    },
  },
  MY: {
    minimumWage: "Minimum wage",
    taxId: "Income tax no.",
    socialSecurity: "EPF / SOCSO",
    taxStatus: "Tax status",
    bonus: "Statutory bonus",
    identifiers: [
      { key: "nric", label: "NRIC" },
      { key: "tax_no", label: "Income tax no." },
      { key: "epf", label: "EPF number" },
      { key: "socso", label: "SOCSO number" },
    ],
    employerIdentifiers: [
      { key: "tax_no", label: "Employer income tax no. (E number)" },
      { key: "epf", label: "EPF employer number" },
      { key: "socso", label: "SOCSO employer number" },
    ],
    categories: {
      tax: "Tax (LHDN)",
      social: "EPF / SOCSO",
      labor: "Labor (JTKSM)",
      other: "Other",
    },
  },
};

export function terminologyFor(countryCode: string): PackTerminology {
  return BY_COUNTRY[countryCode.toUpperCase()] ?? GENERIC;
}
