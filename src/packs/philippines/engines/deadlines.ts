// PH statutory deadline resolution — H21 Phase 3.
//
// Philippine remittance deadlines are NOT a single fixed day of the month:
// each agency staggers employers using the employer's own registration data.
//   • SSS   — last digit of the 10-digit employer (ER) number  (SSS Circular 2021-005, RA 11199)
//   • PhilHealth — last digit of the PEN (PhilHealth Circular 2020-0025, RA 11223)
//   • Pag-IBIG   — first letter of the employer's registered name (HDMF Circular 274, RA 9679)
//   • BIR 1601-C — eFPS industry group (RR 26-2002) or the 10th for non-eFPS (RR 11-2018)
//
// Every resolved date is then rolled forward to the next business day when it
// lands on a weekend or a regular holiday (RA 9492 / annual Proclamation).
// When the employer registry does not carry the identifier needed by a rule,
// we return the statutory *latest* day and flag the occurrence for review —
// we never silently guess a deadline the employer could miss.

export type DeadlineStatus = "resolved" | "needs_review";

export interface PhEmployerSubject {
  /** companies.statutory_metadata */
  sss?: string | null;
  philhealth?: string | null;
  tin?: string | null;
  /** Registered employer name (drives the Pag-IBIG schedule). */
  legalName?: string | null;
  /** eFPS industry grouping letter A–E; undefined = non-eFPS filer. */
  efpsGroup?: string | null;
}

export interface ResolvedDeadline {
  /** ISO date (UTC) after weekend/holiday roll-forward. */
  dueDate: string;
  /** Statutory date before the business-day roll, when it differed. */
  statutoryDate?: string;
  status: DeadlineStatus;
  /** Human-readable explanation of which stagger rule was applied. */
  rule: string;
  reason?: string;
}

const digitsOnly = (v: unknown): string => String(v ?? "").replace(/\D/g, "");
const iso = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Regular holidays with a fixed date (RA 9492 as amended). */
const FIXED_REGULAR_HOLIDAYS: Array<[number, number]> = [
  [1, 1], // New Year's Day
  [4, 9], // Araw ng Kagitingan
  [5, 1], // Labor Day
  [6, 12], // Independence Day
  [11, 30], // Bonifacio Day
  [12, 25], // Christmas Day
  [12, 30], // Rizal Day
];

/** National Heroes Day — last Monday of August. */
function nationalHeroesDay(year: number): [number, number] {
  const last = lastDayOfMonth(year, 8);
  for (let d = last; d > last - 7; d--) {
    if (new Date(Date.UTC(year, 7, d)).getUTCDay() === 1) return [8, d];
  }
  return [8, last];
}

export function phRegularHolidays(year: number): string[] {
  const heroes = nationalHeroesDay(year);
  return [...FIXED_REGULAR_HOLIDAYS, heroes].map(([m, d]) => iso(year, m, d)).sort();
}

function isNonWorkingDay(dateISO: string): boolean {
  const dt = new Date(dateISO + "T00:00:00Z");
  const dow = dt.getUTCDay();
  if (dow === 0 || dow === 6) return true;
  return phRegularHolidays(dt.getUTCFullYear()).includes(dateISO);
}

/** Roll a statutory date forward to the next business day. */
export function rollToBusinessDay(dateISO: string): string {
  let dt = new Date(dateISO + "T00:00:00Z");
  let guard = 0;
  while (isNonWorkingDay(dt.toISOString().slice(0, 10)) && guard++ < 15) {
    dt = new Date(dt.getTime() + 86400000);
  }
  return dt.toISOString().slice(0, 10);
}

function finalize(
  year: number,
  month: number,
  day: number,
  rule: string,
  status: DeadlineStatus,
  reason?: string,
): ResolvedDeadline {
  const clamped = Math.min(day, lastDayOfMonth(year, month));
  const statutory = iso(year, month, clamped);
  const rolled = rollToBusinessDay(statutory);
  return {
    dueDate: rolled,
    ...(rolled !== statutory ? { statutoryDate: statutory } : {}),
    status,
    rule,
    ...(reason ? { reason } : {}),
  };
}

/* ------------------------------------------------------------------ SSS */
/** SSS Circular 2021-005 — payment deadline by last digit of the ER number. */
export function sssDueDay(lastDigit: number, year: number, month: number): number {
  if (lastDigit === 1 || lastDigit === 2) return 10;
  if (lastDigit === 3 || lastDigit === 4) return 15;
  if (lastDigit === 5 || lastDigit === 6) return 20;
  if (lastDigit === 7 || lastDigit === 8) return 25;
  return lastDayOfMonth(year, month); // 9 or 0
}

/* ----------------------------------------------------------- PhilHealth */
/** PhilHealth Circular 2020-0025 — PEN ending 0–4 → 15th; 5–9 → 20th. */
export function philhealthDueDay(lastDigit: number): number {
  return lastDigit <= 4 ? 15 : 20;
}

/* ------------------------------------------------------------- Pag-IBIG */
/** HDMF Circular 274 — schedule by first letter of the employer name. */
export function pagibigDueDay(firstLetter: string, year: number, month: number): number {
  const c = firstLetter.toUpperCase();
  if (c >= "A" && c <= "D") return 14;
  if (c >= "E" && c <= "L") return 19;
  if (c >= "M" && c <= "Q") return 24;
  return lastDayOfMonth(year, month); // R–Z
}

/* ------------------------------------------------------------------ BIR */
/** RR 26-2002 — eFPS staggered filing for 1601-C; non-eFPS files on the 10th. */
export function birDueDay(efpsGroup?: string | null): number {
  switch ((efpsGroup ?? "").toUpperCase()) {
    case "A":
      return 15;
    case "B":
      return 14;
    case "C":
      return 13;
    case "D":
      return 12;
    case "E":
      return 11;
    default:
      return 10;
  }
}

/**
 * Resolve the due date of a monthly PH obligation for the period
 * `periodYear`/`periodMonth` (1-12). Remittances are always due in the
 * following month.
 */
export function resolvePhMonthlyDeadline(
  code: string,
  periodYear: number,
  periodMonth: number,
  subject?: PhEmployerSubject | null,
): ResolvedDeadline {
  const dueMonth = periodMonth === 12 ? 1 : periodMonth + 1;
  const dueYear = periodMonth === 12 ? periodYear + 1 : periodYear;
  const s = subject ?? {};

  if (code === "SSS-R5") {
    const d = digitsOnly(s.sss);
    if (d.length !== 10) {
      return finalize(
        dueYear,
        dueMonth,
        lastDayOfMonth(dueYear, dueMonth),
        "SSS Circular 2021-005 — last digit of ER number",
        "needs_review",
        "Employer SSS number missing or malformed; assumed the latest statutory day (digit 9/0 bracket).",
      );
    }
    const digit = Number(d[d.length - 1]);
    return finalize(
      dueYear,
      dueMonth,
      sssDueDay(digit, dueYear, dueMonth),
      `SSS Circular 2021-005 — ER number ends in ${digit}`,
      "resolved",
    );
  }

  if (code === "PHIC-RF1") {
    const d = digitsOnly(s.philhealth);
    if (d.length !== 12) {
      return finalize(
        dueYear,
        dueMonth,
        15,
        "PhilHealth Circular 2020-0025 — last digit of PEN",
        "needs_review",
        "Employer PhilHealth number (PEN) missing or malformed; assumed the earliest bracket (15th).",
      );
    }
    const digit = Number(d[d.length - 1]);
    return finalize(
      dueYear,
      dueMonth,
      philhealthDueDay(digit),
      `PhilHealth Circular 2020-0025 — PEN ends in ${digit}`,
      "resolved",
    );
  }

  if (code === "HDMF-MCRF") {
    const letter = String(s.legalName ?? "")
      .trim()
      .charAt(0);
    if (!/[A-Za-z]/.test(letter)) {
      return finalize(
        dueYear,
        dueMonth,
        10,
        "HDMF Circular 274 — first letter of the employer name",
        "needs_review",
        "Registered employer name missing; assumed the earliest bracket (A–D).",
      );
    }
    return finalize(
      dueYear,
      dueMonth,
      pagibigDueDay(letter, dueYear, dueMonth),
      `HDMF Circular 274 — employer name starts with "${letter.toUpperCase()}"`,
      "resolved",
    );
  }

  if (code === "BIR-1601C") {
    const group = s.efpsGroup ?? null;
    return finalize(
      dueYear,
      dueMonth,
      birDueDay(group),
      group
        ? `RR 26-2002 — eFPS staggered group ${String(group).toUpperCase()}`
        : "RR 11-2018 — non-eFPS filer (10th of the following month)",
      "resolved",
    );
  }

  // Unknown monthly code — keep a conservative 15th and flag it.
  return finalize(
    dueYear,
    dueMonth,
    15,
    "Default monthly remittance",
    "needs_review",
    `No stagger rule registered for ${code}`,
  );
}

/** Annual obligations: fixed statutory date, still rolled to a business day. */
export function resolvePhAnnualDeadline(
  year: number,
  month: number,
  day: number,
  rule: string,
): ResolvedDeadline {
  return finalize(year, month, day, rule, "resolved");
}

/** Convenience: build the subject from companies.statutory_metadata + name. */
export function phSubjectFrom(
  statutoryMetadata: Record<string, unknown> | null | undefined,
  legalName?: string | null,
): PhEmployerSubject {
  const m = statutoryMetadata ?? {};
  return {
    sss: (m.sss as string) ?? null,
    philhealth: (m.philhealth as string) ?? null,
    tin: (m.tin as string) ?? null,
    efpsGroup: (m.efpsGroup as string) ?? null,
    legalName: legalName ?? (m.legalName as string) ?? null,
  };
}
