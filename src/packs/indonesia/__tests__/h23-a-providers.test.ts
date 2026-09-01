// H23-A — provider/config wiring: overtime capability + BPJS params via ConfigService.
import { describe, it, expect } from "vitest";
import { indonesiaPack } from "@/packs/indonesia";
import { buildIndonesiaParamsMap, BPJS_2026 } from "@/packs/indonesia/params";

describe("H23-A wiring", () => {
  it("exposes an overtime provider under the declared capability", () => {
    expect(indonesiaPack.supports("overtime")).toBe(true);
    expect(indonesiaPack.providers.overtime).toBeDefined();
  });

  it("computes weekday overtime at 1/173 with 1.5x / 2x factors", () => {
    const r = indonesiaPack.providers.overtime!.calculate({
      monthlySalary: 8_650_000,
      hours: 5,
      dayType: "weekday",
    });
    expect(r.hourlyRate).toBeCloseTo(50_000, 0);
    // 4h × 1.5 + 1h × 2 = 8 × hourly
    expect(r.totalPay).toBe(400_000);
    expect(r.breakdown).toHaveLength(2);
    expect(r.legalBasis).toContain("Cipta Kerja");
  });

  it("honours the 6x7 work-week pattern on rest days", () => {
    const r = indonesiaPack.providers.overtime!.calculate({
      monthlySalary: 8_650_000,
      hours: 8,
      dayType: "rest-day",
      metadata: { pattern: "6x7" },
    });
    // 7h × 2 + 1h × 3 = 17 × hourly
    expect(r.totalPay).toBe(850_000);
  });

  it("serves BPJS parameters from the params map instead of code constants", () => {
    const map = buildIndonesiaParamsMap();
    expect(map["id.bpjs.version"]).toBe(BPJS_2026.version);
    expect(map[BPJS_2026.jht.key]).toEqual(BPJS_2026.jht);
    expect(map[BPJS_2026.jkp.key]).toEqual(BPJS_2026.jkp);
    expect(map[BPJS_2026.jkk.key]).toEqual(BPJS_2026.jkk);
  });

  it("keeps BPJS provenance honest (health ceiling still media-report)", () => {
    const b = indonesiaPack.providers.benefits!.calculate({ salary: 10_000_000 });
    expect(b.sourceStatus?.health).toBe("media-report");
    expect(b.jkp).toBeDefined();
  });
});
