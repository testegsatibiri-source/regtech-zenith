// H11.1a — Eid al-Fitr calendar table. THR must be paid ≥ 7 days before.
// Dates are the *observed* Gregorian date of 1 Syawal in Indonesia; the
// authoritative source is SKB 3 Menteri published yearly. Values here are
// static and updated on legislative change (no deploy required in H12).
//
// When an entry is missing the calendar template must mark the derived
// obligation as `needs_review` rather than fall back to a guess.

export interface EidEntry {
  year: number;
  gregorianDate: string; // ISO date of 1 Syawal
  source: string; // authority citation
}

export const ID_EID_AL_FITR: readonly EidEntry[] = [
  { year: 2025, gregorianDate: "2025-03-31", source: "SKB 3 Menteri 2024" },
  { year: 2026, gregorianDate: "2026-03-20", source: "SKB 3 Menteri 2025 (estimated)" },
  { year: 2027, gregorianDate: "2027-03-09", source: "astronomical estimate" },
  { year: 2028, gregorianDate: "2028-02-26", source: "astronomical estimate" },
  { year: 2029, gregorianDate: "2029-02-14", source: "astronomical estimate" },
  { year: 2030, gregorianDate: "2030-02-04", source: "astronomical estimate" },
] as const;

export function eidAlFitrConfigKey(year: number): string {
  return `id.calendar.eidAlFitr.${year}`;
}

/** THR due date = Eid al-Fitr − 7 days. Returns null if year not seeded. */
export function thrDueDate(year: number): string | null {
  const entry = ID_EID_AL_FITR.find((e) => e.year === year);
  if (!entry) return null;
  const eid = new Date(entry.gregorianDate + "T00:00:00Z");
  const due = new Date(eid.getTime() - 7 * 86400000);
  return due.toISOString().slice(0, 10);
}
