// H23-B — THR keagamaan by declared religion (PP 36/2021 art. 9).
import { describe, it, expect } from "vitest";
import { indonesiaPack } from "@/packs/indonesia";
import { calculateThr } from "@/lib/engines/indonesia";
import {
  RELIGIONS,
  thrDueDateForReligion,
  resolveThrHoliday,
  religiousHolidayConfigKey,
} from "@/packs/indonesia/params/religious-holidays";
import { buildIndonesiaParamsMap } from "@/packs/indonesia/params";

describe("H23-B — THR by religion", () => {
  it("anchors Muslim THR to Idul Fitri minus 7 days", () => {
    const r = thrDueDateForReligion("islam", 2026);
    expect(r.holidayDate).toBe("2026-03-20");
    expect(r.dueDate).toBe("2026-03-13");
  });

  it("anchors Christian and Catholic THR to Natal", () => {
    for (const religion of ["kristen", "katolik"] as const) {
      const r = thrDueDateForReligion(religion, 2026);
      expect(r.holiday).toBe("Natal");
      expect(r.dueDate).toBe("2026-12-18");
      expect(r.needsReview).toBe(false);
    }
  });

  it("anchors Hindu, Buddhist and Confucian THR to their own holidays", () => {
    expect(thrDueDateForReligion("hindu", 2026).holiday).toBe("Nyepi");
    expect(thrDueDateForReligion("buddha", 2026).holiday).toBe("Waisak");
    expect(thrDueDateForReligion("konghucu", 2026).holiday).toBe("Imlek");
  });

  it("flags unseeded years as needing review instead of guessing", () => {
    const r = thrDueDateForReligion("hindu", 2035);
    expect(r.dueDate).toBeNull();
    expect(r.sourceStatus).toBe("unseeded");
    expect(r.needsReview).toBe(true);
  });

  it("flags estimated decree dates as needing review", () => {
    const r = thrDueDateForReligion("buddha", 2027);
    expect(r.sourceStatus).toBe("estimate");
    expect(r.needsReview).toBe(true);
  });

  it("keeps the amount rules intact and attaches the deadline", () => {
    const r = calculateThr({
      monthlySalary: 6_000_000,
      monthsOfService: 6,
      religion: "kristen",
      year: 2026,
    });
    expect(r.amount).toBe(3_000_000);
    expect(r.prorated).toBe(true);
    expect(r.due?.dueDate).toBe("2026-12-18");
  });

  it("stays backward compatible when no religion is declared", () => {
    const r = calculateThr({ monthlySalary: 6_000_000, monthsOfService: 12 });
    expect(r.amount).toBe(6_000_000);
    expect(r.due).toBeUndefined();
  });

  it("exposes the religion-aware deadline through the thirteenth provider", () => {
    const out = indonesiaPack.providers.thirteenth!.calculate({
      monthlySalary: 10_000_000,
      monthsOfService: 12,
      metadata: { religion: "hindu", year: 2026 },
    });
    expect(out.amount).toBe(10_000_000);
    expect(out.due?.holiday).toBe("Nyepi");
    expect(out.due?.legalBasis).toContain("PP 36/2021");
  });

  it("serves each religion's anchor holiday from the params map", () => {
    const map = buildIndonesiaParamsMap();
    for (const religion of RELIGIONS) {
      const key = religiousHolidayConfigKey(religion, 2026);
      expect(map[key]).toEqual(resolveThrHoliday(religion, 2026));
    }
  });
});
