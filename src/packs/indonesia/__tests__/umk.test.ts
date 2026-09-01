// H23-A0 — UMP -> UMK hierarchy and visible source-status degradation.
import { describe, expect, it } from "vitest";
import {
  UMK_TABLE,
  resolveWageFloor,
  umkConclusive,
  type ProvincialFloor,
} from "@/packs/indonesia/params/umk-2026";
import { evaluateEmployee } from "@/lib/engines/compliance";

const officialUmp = (province: string, amount: number): ProvincialFloor => ({
  province,
  amount,
  sourceStatus: "official",
});

describe("ID UMK hierarchy", () => {
  it("never ships an unverified figure as official", () => {
    for (const entry of UMK_TABLE) expect(entry.sourceStatus).toBe("stale");
    expect(umkConclusive()).toBe(false);
  });

  it("prefers the district floor when it exceeds the provincial floor", () => {
    const r = resolveWageFloor(officialUmp("Jawa Barat", 2_310_000), "Kota Bekasi");
    expect(r.layer).toBe("umk");
    expect(r.amount).toBe(5_690_752);
    expect(r.jurisdiction).toContain("Kota Bekasi");
  });

  it("keeps the provincial floor when no UMK is reconciled", () => {
    const r = resolveWageFloor(officialUmp("Bali", 3_200_000), "Denpasar");
    expect(r.layer).toBe("ump");
    expect(r.amount).toBe(3_200_000);
    expect(r.trail.join(" ")).toContain("No reconciled UMK");
  });

  it("keeps the provincial floor when the UMP is higher than a stale UMK", () => {
    const r = resolveWageFloor(officialUmp("Jawa Tengah", 4_000_000), "Kota Semarang");
    expect(r.layer).toBe("ump");
    expect(r.amount).toBe(4_000_000);
  });

  it("propagates the worst source status across the chain", () => {
    const r = resolveWageFloor(officialUmp("Jawa Timur", 2_440_000), "Kota Surabaya");
    expect(r.sourceStatus).toBe("stale");
    expect(r.conclusive).toBe(false);
  });

  it("stays conclusive only when every layer is official", () => {
    const r = resolveWageFloor(officialUmp("Bali", 3_200_000), null);
    expect(r.conclusive).toBe(true);
    expect(r.sourceStatus).toBe("official");
  });

  it("degrades ID-UMR-01 to non-conclusive for a district with a stale UMK", () => {
    const findings = evaluateEmployee(
      {
        full_name: "Siti",
        base_salary: 9_000_000,
        country_metadata: { province: "Jawa Barat", city: "Kota Bekasi" },
      },
      "ID",
    );
    const rule = findings.find((f) => f.rule_code === "ID-UMR-01")!;
    expect(rule.conclusive).toBe(false);
    expect(rule.message).toContain("Chain:");
    expect(rule.message).toContain("UMK Kota Bekasi");
  });
});
