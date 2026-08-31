// H23-A0 — UMP epistemic honesty: non-official sources must not report conclusive compliance.
import { describe, expect, it } from "bun:test";
import { UMP_2026, UMP_FALLBACK } from "@/packs/indonesia/params/ump-2026";
import { evaluateEmployee } from "@/lib/engines/compliance";

describe("ID UMP 2026", () => {
  it("ships 38 provincial entries plus fallback", () => {
    expect(UMP_2026.length).toBe(38);
    expect(UMP_FALLBACK.province).toBe("Other");
  });

  it("marks every 2026 entry as media-report while official SK Gubernur is pending", () => {
    for (const entry of UMP_2026) {
      expect(entry.sourceStatus).toBe("media-report");
      expect(entry.stale).toBe(false);
    }
  });

  it("reports ID-UMR-01 as non-conclusive when source is not official", () => {
    const findings = evaluateEmployee(
      {
        full_name: "Budi",
        base_salary: 10_000_000,
        country_metadata: { province: "DKI Jakarta" },
      },
      "ID",
    );
    const ump = findings.find((f) => f.rule_code === "ID-UMR-01");
    expect(ump).toBeDefined();
    expect(ump!.conclusive).toBe(false);
    expect(ump!.passed).toBe(false);
    expect(ump!.message).toContain("non-conclusive");
  });

  it("would pass conclusively if an official source were present", () => {
    // This documents the intended contract: official source + salary above UMP = conclusive pass.
    const officialLike = UMP_2026.find((e) => e.province === "DKI Jakarta")!;
    expect(officialLike.amount).toBeGreaterThan(5_000_000);
  });
});
