// H21 Phase 3 — PH staggered statutory deadlines.
import { describe, expect, it } from "vitest";
import {
  resolvePhMonthlyDeadline,
  rollToBusinessDay,
  phRegularHolidays,
  sssDueDay,
  philhealthDueDay,
  pagibigDueDay,
  birDueDay,
} from "../engines/deadlines";
import { phCalendarTemplates } from "../engines/calendar";

describe("SSS stagger (Circular 2021-005)", () => {
  it("maps the last ER digit to the statutory bracket", () => {
    expect(sssDueDay(1, 2026, 3)).toBe(10);
    expect(sssDueDay(4, 2026, 3)).toBe(15);
    expect(sssDueDay(6, 2026, 3)).toBe(20);
    expect(sssDueDay(8, 2026, 3)).toBe(25);
    expect(sssDueDay(9, 2026, 2)).toBe(28); // last day of Feb 2026
    expect(sssDueDay(0, 2026, 4)).toBe(30);
  });

  it("resolves from the employer number and rolls off weekends", () => {
    // ER ends in 1 → 10th of the following month. Jan 2026 period → 10 Feb 2026 (Tue).
    const r = resolvePhMonthlyDeadline("SSS-R5", 2026, 1, { sss: "0312345671" });
    expect(r.status).toBe("resolved");
    expect(r.dueDate).toBe("2026-02-10");
  });

  it("flags the occurrence when the ER number is missing", () => {
    const r = resolvePhMonthlyDeadline("SSS-R5", 2026, 1, {});
    expect(r.status).toBe("needs_review");
    expect(r.reason).toMatch(/missing or malformed/i);
  });
});

describe("PhilHealth / Pag-IBIG / BIR stagger", () => {
  it("splits PEN digits into the 15th and 20th brackets", () => {
    expect(philhealthDueDay(0)).toBe(15);
    expect(philhealthDueDay(4)).toBe(15);
    expect(philhealthDueDay(5)).toBe(20);
    expect(philhealthDueDay(9)).toBe(20);
  });

  it("maps the Pag-IBIG schedule from the employer name letter", () => {
    expect(pagibigDueDay("A", 2026, 3)).toBe(14);
    expect(pagibigDueDay("F", 2026, 3)).toBe(19);
    expect(pagibigDueDay("m", 2026, 3)).toBe(24);
    expect(pagibigDueDay("Z", 2026, 4)).toBe(30);
  });

  it("applies the eFPS staggered groups for 1601-C", () => {
    expect(birDueDay("A")).toBe(15);
    expect(birDueDay("E")).toBe(11);
    expect(birDueDay(null)).toBe(10);
  });
});

describe("business-day roll-forward", () => {
  it("keeps regular holidays out of the deadline set", () => {
    expect(phRegularHolidays(2026)).toContain("2026-12-30");
    // National Heroes Day — last Monday of August 2026 is the 31st.
    expect(phRegularHolidays(2026)).toContain("2026-08-31");
  });

  it("moves a weekend deadline to the next business day", () => {
    // 2026-05-10 is a Sunday.
    expect(rollToBusinessDay("2026-05-10")).toBe("2026-05-11");
    // 2026-05-01 (Labor Day, Friday) → Monday 4 May.
    expect(rollToBusinessDay("2026-05-01")).toBe("2026-05-04");
  });

  it("records the pre-roll statutory date", () => {
    const r = resolvePhMonthlyDeadline("BIR-1601C", 2026, 4, {}); // due 10 May 2026 (Sun)
    expect(r.statutoryDate).toBe("2026-05-10");
    expect(r.dueDate).toBe("2026-05-11");
  });
});

describe("calendar templates wiring", () => {
  it("produces 12 resolved monthly occurrences for a registered employer", () => {
    const sss = phCalendarTemplates().find((t) => t.code === "SSS-R5")!;
    const occ = sss.occurrences(2026, {
      statutoryMetadata: { sss: "03-1234567-3" },
      legalName: "Acme Manila Inc.",
    });
    expect(occ).toHaveLength(12);
    expect(occ.every((o) => o.resolution === "resolved")).toBe(true);
    expect(occ[0].rule).toMatch(/ER number ends in 3/);
  });

  it("marks Pag-IBIG for review when the employer name is unknown", () => {
    const hdmf = phCalendarTemplates().find((t) => t.code === "HDMF-MCRF")!;
    const occ = hdmf.occurrences(2026, { legalName: "" });
    expect(occ[0].resolution).toBe("needs_review");
  });

  it("keeps annual filings on their statutory date rolled to a business day", () => {
    const alpha = phCalendarTemplates().find((t) => t.code === "BIR-1604C")!;
    const occ = alpha.occurrences(2026, {});
    expect(occ).toHaveLength(1);
    // 31 Jan 2027 is a Sunday → 1 Feb 2027.
    expect(occ[0].due_date).toBe("2027-02-01");
  });
});
