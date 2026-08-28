// PH statutory identifiers — H21 Phase 2.
// Format validation only (no checksum is published by BIR/SSS/PhilHealth/HDMF).
// These identifiers are an absolute prerequisite for any filing (Phase 4): a
// remittance file with a malformed TIN or SSS number is rejected at upload.

export type PhIdentifierKey = "tin" | "sss" | "philhealth" | "pagibig";

export interface IdentifierSpec {
  key: PhIdentifierKey;
  label: string;
  /** Digits accepted after stripping separators. */
  digits: number[];
  /** Canonical display mask applied to the digit string. */
  format: (digits: string) => string;
  legalBasis: string;
}

export interface IdentifierIssue {
  key: string;
  label: string;
  reason: "missing" | "invalid";
  message: string;
}

export interface IdentifierValidation {
  complete: boolean;
  valid: boolean;
  issues: IdentifierIssue[];
  /** Normalized (mask-formatted) values for the identifiers that are valid. */
  normalized: Partial<Record<string, string>>;
}

const digitsOnly = (v: unknown): string => String(v ?? "").replace(/\D/g, "");

function mask(d: string, groups: number[], sep = "-"): string {
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    out.push(d.slice(i, i + g));
    i += g;
  }
  if (i < d.length) out.push(d.slice(i));
  return out.filter(Boolean).join(sep);
}

/** Employee-level identifiers (employees.country_metadata). */
export const PH_EMPLOYEE_IDENTIFIERS: IdentifierSpec[] = [
  {
    key: "tin",
    label: "TIN",
    // 9 digits (individual) or 12 with the 3-digit branch code.
    digits: [9, 12],
    format: (d) => (d.length === 12 ? mask(d, [3, 3, 3, 3]) : mask(d, [3, 3, 3])),
    legalBasis: "NIRC §236 / RR 7-2012",
  },
  {
    key: "sss",
    label: "SSS number",
    digits: [10],
    format: (d) => mask(d, [2, 7, 1]),
    legalBasis: "RA 11199 §24",
  },
  {
    key: "philhealth",
    label: "PhilHealth number (PIN)",
    digits: [12],
    format: (d) => mask(d, [2, 9, 1]),
    legalBasis: "RA 11223 (UHC Act)",
  },
  {
    key: "pagibig",
    label: "Pag-IBIG MID",
    digits: [12],
    format: (d) => mask(d, [4, 4, 4]),
    legalBasis: "RA 9679 (HDMF Law)",
  },
];

/** Employer-level identifiers (companies.statutory_metadata). */
export const PH_EMPLOYER_IDENTIFIERS: IdentifierSpec[] = [
  {
    key: "tin" as PhIdentifierKey,
    label: "Employer TIN (with branch code)",
    digits: [9, 12],
    format: (d) => (d.length === 12 ? mask(d, [3, 3, 3, 3]) : mask(d, [3, 3, 3])),
    legalBasis: "NIRC §236",
  },
  {
    key: "rdo" as PhIdentifierKey,
    label: "BIR RDO code",
    digits: [3],
    format: (d) => d,
    legalBasis: "RR 11-2018",
  },
  {
    key: "sss" as PhIdentifierKey,
    label: "SSS employer number",
    digits: [10],
    format: (d) => mask(d, [2, 7, 1]),
    legalBasis: "RA 11199",
  },
  {
    key: "philhealth" as PhIdentifierKey,
    label: "PhilHealth employer number (PEN)",
    digits: [12],
    format: (d) => mask(d, [2, 9, 1]),
    legalBasis: "RA 11223",
  },
  {
    key: "pagibig" as PhIdentifierKey,
    label: "Pag-IBIG employer ID",
    digits: [12],
    format: (d) => mask(d, [4, 4, 4]),
    legalBasis: "RA 9679",
  },
];

function validateAgainst(
  specs: IdentifierSpec[],
  source: Record<string, unknown> | null | undefined,
): IdentifierValidation {
  const meta = source ?? {};
  const issues: IdentifierIssue[] = [];
  const normalized: Record<string, string> = {};

  for (const spec of specs) {
    const raw = meta[spec.key];
    const d = digitsOnly(raw);
    if (!d) {
      issues.push({
        key: spec.key,
        label: spec.label,
        reason: "missing",
        message: `${spec.label} is not registered (${spec.legalBasis})`,
      });
      continue;
    }
    if (!spec.digits.includes(d.length)) {
      issues.push({
        key: spec.key,
        label: spec.label,
        reason: "invalid",
        message: `${spec.label} must have ${spec.digits.join(" or ")} digits — got ${d.length}`,
      });
      continue;
    }
    normalized[spec.key] = spec.format(d);
  }

  return {
    complete: issues.length === 0,
    valid: issues.every((i) => i.reason !== "invalid"),
    issues,
    normalized,
  };
}

export function validatePhEmployeeIdentifiers(
  countryMetadata: Record<string, unknown> | null | undefined,
): IdentifierValidation {
  return validateAgainst(PH_EMPLOYEE_IDENTIFIERS, countryMetadata);
}

export function validatePhEmployerIdentifiers(
  statutoryMetadata: Record<string, unknown> | null | undefined,
): IdentifierValidation {
  return validateAgainst(PH_EMPLOYER_IDENTIFIERS, statutoryMetadata);
}

/** True when the employer/employee records can back a statutory filing. */
export function phFilingReadiness(input: {
  employer?: Record<string, unknown> | null;
  employees?: Array<Record<string, unknown>>;
}): { ready: boolean; employerIssues: number; employeesMissing: number } {
  const employer = validatePhEmployerIdentifiers(input.employer);
  const employeesMissing = (input.employees ?? []).filter(
    (e) => !validatePhEmployeeIdentifiers(
      (e.country_metadata as Record<string, unknown> | null) ?? null,
    ).complete,
  ).length;
  return {
    ready: employer.complete && employeesMissing === 0,
    employerIssues: employer.issues.length,
    employeesMissing,
  };
}

// ---------------------------------------------------------------------------
// Solo Parent ID — H22 Phase C closing item.
// RA 8972 as amended by RA 11861 §5: the Solo Parent ID is issued by the city
// or municipal social welfare office and is valid for one (1) year, renewable.
// Parental leave (7 days) and the 120-day maternity uplift are conditioned on a
// *valid* (non-expired) ID, so the engine never grants them on a raw boolean.
// ---------------------------------------------------------------------------

export interface SoloParentIdStatus {
  /** Employee record claims solo-parent status. */
  claimed: boolean;
  /** An ID number is on file. */
  present: boolean;
  /** Expiry date on file (ISO date), when captured. */
  expiresOn: string | null;
  expired: boolean;
  /** Claimed AND present AND not expired. */
  valid: boolean;
  message: string;
  legalBasis: string;
}

const SOLO_PARENT_BASIS = "RA 8972 §5 as amended by RA 11861";

export function validatePhSoloParentId(
  countryMetadata: Record<string, unknown> | null | undefined,
  asOf?: string,
): SoloParentIdStatus {
  const meta = countryMetadata ?? {};
  const claimed = Boolean(meta["solo_parent"]);
  const idNumber = String(meta["solo_parent_id"] ?? "").trim();
  const rawExpiry = String(meta["solo_parent_id_expiry"] ?? "").trim();
  const expiresOn = /^\d{4}-\d{2}-\d{2}$/.test(rawExpiry) ? rawExpiry : null;
  const today = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)
    ? asOf
    : new Date().toISOString().slice(0, 10);
  const present = idNumber.length > 0;
  const expired = present && expiresOn !== null && expiresOn < today;

  let message: string;
  if (!claimed) message = "Employee is not registered as a solo parent";
  else if (!present) message = `Solo Parent ID number is missing (${SOLO_PARENT_BASIS})`;
  else if (!expiresOn) message = "Solo Parent ID validity date is missing — the ID must be renewed yearly";
  else if (expired) message = `Solo Parent ID expired on ${expiresOn} — renew before granting parental leave`;
  else message = `Solo Parent ID valid until ${expiresOn}`;

  return {
    claimed,
    present,
    expiresOn,
    expired,
    valid: claimed && present && expiresOn !== null && !expired,
    message,
    legalBasis: SOLO_PARENT_BASIS,
  };
}
