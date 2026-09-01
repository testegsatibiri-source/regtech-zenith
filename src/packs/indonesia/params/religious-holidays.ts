// H23-B — THR by declared religion (PP 36/2021 art. 9 + Permenaker 6/2016).
//
// THR keagamaan is due at least 7 days before the religious holiday of the
// employee's *declared* religion, not universally before Idul Fitri:
//   Islam       → Idul Fitri (1 Syawal)
//   Kristen     → Natal (25 December)
//   Katolik     → Natal (25 December)
//   Hindu       → Nyepi (Tahun Baru Saka)
//   Buddha      → Waisak
//   Konghucu    → Imlek (Tahun Baru Imlek)
//
// Every non-fixed date depends on the yearly SKB 3 Menteri. Where the
// decree for a given year has not been harvested, the entry carries
// `sourceStatus: "estimate"` and the derived obligation must be reported as
// `needs_review` instead of being presented as a settled deadline.

import { ID_EID_AL_FITR } from "./eid-al-fitr";

export type Religion = "islam" | "kristen" | "katolik" | "hindu" | "buddha" | "konghucu";

export const RELIGIONS: readonly Religion[] = [
  "islam", "kristen", "katolik", "hindu", "buddha", "konghucu",
] as const;

export type HolidaySourceStatus = "official" | "estimate";

export interface ReligiousHolidayEntry {
  year: number;
  holiday: string;
  gregorianDate: string;
  source: string;
  sourceStatus: HolidaySourceStatus;
}

/** Nyepi (Hindu) — Saka new year. */
export const ID_NYEPI: readonly ReligiousHolidayEntry[] = [
  { year: 2025, holiday: "Nyepi", gregorianDate: "2025-03-29", source: "SKB 3 Menteri 2024", sourceStatus: "official" },
  { year: 2026, holiday: "Nyepi", gregorianDate: "2026-03-19", source: "SKB 3 Menteri 2025", sourceStatus: "official" },
  { year: 2027, holiday: "Nyepi", gregorianDate: "2027-03-08", source: "astronomical estimate", sourceStatus: "estimate" },
] as const;

/** Waisak (Buddha). */
export const ID_WAISAK: readonly ReligiousHolidayEntry[] = [
  { year: 2025, holiday: "Waisak", gregorianDate: "2025-05-12", source: "SKB 3 Menteri 2024", sourceStatus: "official" },
  { year: 2026, holiday: "Waisak", gregorianDate: "2026-06-01", source: "SKB 3 Menteri 2025", sourceStatus: "official" },
  { year: 2027, holiday: "Waisak", gregorianDate: "2027-05-20", source: "astronomical estimate", sourceStatus: "estimate" },
] as const;

/** Imlek (Konghucu) — Chinese lunar new year. */
export const ID_IMLEK: readonly ReligiousHolidayEntry[] = [
  { year: 2025, holiday: "Imlek", gregorianDate: "2025-01-29", source: "SKB 3 Menteri 2024", sourceStatus: "official" },
  { year: 2026, holiday: "Imlek", gregorianDate: "2026-02-17", source: "SKB 3 Menteri 2025", sourceStatus: "official" },
  { year: 2027, holiday: "Imlek", gregorianDate: "2027-02-06", source: "lunar calendar estimate", sourceStatus: "estimate" },
] as const;

export function religiousHolidayConfigKey(religion: Religion, year: number): string {
  return `id.calendar.thrHoliday.${religion}.${year}`;
}

function natal(year: number): ReligiousHolidayEntry {
  return {
    year,
    holiday: "Natal",
    gregorianDate: `${year}-12-25`,
    source: "Fixed statutory date (25 December)",
    sourceStatus: "official",
  };
}

/** Resolves the religious holiday that anchors THR for a given religion/year. */
export function resolveThrHoliday(religion: Religion, year: number): ReligiousHolidayEntry | null {
  switch (religion) {
    case "islam": {
      const eid = ID_EID_AL_FITR.find((e) => e.year === year);
      if (!eid) return null;
      return {
        year,
        holiday: "Idul Fitri",
        gregorianDate: eid.gregorianDate,
        source: eid.source,
        sourceStatus: eid.source.toLowerCase().includes("estimate") ? "estimate" : "official",
      };
    }
    case "kristen":
    case "katolik":
      return natal(year);
    case "hindu":
      return ID_NYEPI.find((e) => e.year === year) ?? null;
    case "buddha":
      return ID_WAISAK.find((e) => e.year === year) ?? null;
    case "konghucu":
      return ID_IMLEK.find((e) => e.year === year) ?? null;
    default:
      return null;
  }
}

export interface ThrDueResolution {
  religion: Religion;
  year: number;
  holiday: string | null;
  holidayDate: string | null;
  /** Holiday date minus 7 days, or null when the year is not seeded. */
  dueDate: string | null;
  sourceStatus: HolidaySourceStatus | "unseeded";
  /** True whenever the deadline must not be presented as settled. */
  needsReview: boolean;
  legalBasis: string;
  message: string;
}

const LEGAL_BASIS = "PP 36/2021 art. 9; Permenaker 6/2016";

/** THR due date = religious holiday − 7 days, with provenance. */
export function thrDueDateForReligion(religion: Religion, year: number): ThrDueResolution {
  const entry = resolveThrHoliday(religion, year);
  if (!entry) {
    return {
      religion,
      year,
      holiday: null,
      holidayDate: null,
      dueDate: null,
      sourceStatus: "unseeded",
      needsReview: true,
      legalBasis: LEGAL_BASIS,
      message: `No seeded holiday date for ${religion} in ${year}; THR deadline needs review against SKB 3 Menteri.`,
    };
  }
  const due = new Date(new Date(entry.gregorianDate + "T00:00:00Z").getTime() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const needsReview = entry.sourceStatus !== "official";
  return {
    religion,
    year,
    holiday: entry.holiday,
    holidayDate: entry.gregorianDate,
    dueDate: due,
    sourceStatus: entry.sourceStatus,
    needsReview,
    legalBasis: LEGAL_BASIS,
    message: needsReview
      ? `${entry.holiday} ${year} date is an ${entry.sourceStatus} (${entry.source}); THR deadline ${due} needs review.`
      : `THR due ${due}, 7 days before ${entry.holiday} ${entry.gregorianDate} (${entry.source}).`,
  };
}
