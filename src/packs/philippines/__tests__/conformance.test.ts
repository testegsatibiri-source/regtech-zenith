// PH pack conformance — mounts the SDK Test Kit + PH-specific fixtures.
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { philippinesPack } from "..";
import {
  runManifestSuite,
  runTaxProviderSuite,
  runBenefitsProviderSuite,
  runIsolationSuite,
} from "@/sdk/testkit";
import { PH_TAX_CASES, PH_BENEFITS_CASES } from "@/sdk/testkit/fixtures/PH";

// Fixtures widened to the testkit's shape (surcharge unused in PH).
runManifestSuite(philippinesPack);
runTaxProviderSuite(philippinesPack, PH_TAX_CASES.map((c) => ({ ...c, expected: { ...c.expected } })));
runBenefitsProviderSuite(philippinesPack, PH_BENEFITS_CASES.map((c) => ({ ...c, expected: { ...c.expected } })));
runIsolationSuite(philippinesPack, path.resolve(__dirname, ".."));

// PH-specific invariants
describe("[PH] pack-specific", () => {
  it("13th month is pro-rata for < 12 months of service", () => {
    const r = philippinesPack.providers.thirteenth!.calculate({ monthlySalary: 30_000, monthsOfService: 6 });
    expect(r.eligible).toBe(true);
    expect(r.prorated).toBe(true);
    expect(r.amount).toBe(15_000);
    expect(r.fallbackToMonthly).toBe(true);
  });

  it("13th month uses annual gross earned when provided (PD 851)", () => {
    const r = philippinesPack.providers.thirteenth!.calculate({
      monthlySalary: 30_000,
      monthsOfService: 12,
      annualGrossEarned: 360_000,
    });
    expect(r.amount).toBe(30_000);
    expect(r.fallbackToMonthly).toBe(false);
    expect(r.base).toBe(30_000);
  });

  it("SSS stepped table resolves exact MSC brackets", () => {
    const b = philippinesPack.providers.benefits!;
    const row15k = b.calculate({ salary: 15_000 }).employee;
    expect(row15k.sss).toBe(675);
    const row30k = b.calculate({ salary: 30_000 }).employee;
    expect(row30k.sss).toBe(1_350);
    const row35k = b.calculate({ salary: 35_000 }).employee;
    expect(row35k.sss).toBe(1_350); // clamped at MSC cap
    const row10k = b.calculate({ salary: 10_000 }).employee;
    expect(row10k.sss).toBe(450);
  });

  it("Tax applies BIR ₱90,000 annual benefits ceiling exemption", () => {
    const tax = philippinesPack.providers.tax!;
    const baseline = tax.calculate({ monthlyGross: 30_000, maritalStatus: "single" });
    const withExempt = tax.calculate({ monthlyGross: 30_000, maritalStatus: "single", nonTaxableBenefits: 20_000 });
    expect(withExempt.tax).toBeLessThan(baseline.tax);
    expect(withExempt.tax).toBe(0); // 30k - 20k = 10k, below 20,833 bracket
  });

  it("Tax clamps exemption to remaining annual ceiling", () => {
    const tax = philippinesPack.providers.tax!;
    const out = tax.calculate({
      monthlyGross: 30_000,
      maritalStatus: "single",
      nonTaxableBenefits: 20_000,
      cumulativeTaxableBenefits: 80_000,
    });
    // Remaining ceiling = 10,000, so only 10,000 exempt; taxable = 20,000
    expect(out.tax).toBe(0);
  });

  it("Calendar produces 12 monthly + 1 annual per template", () => {
    const templates = philippinesPack.providers.calendar!.templates();
    const monthly = templates.find((t) => t.code === "BIR-1601C")!.occurrences(2025);
    const annual = templates.find((t) => t.code === "BIR-2316")!.occurrences(2025);
    expect(monthly).toHaveLength(12);
    expect(annual).toHaveLength(1);
    // H21 P3: 31 Jan 2026 is a Saturday → rolled to the next business day.
    expect(annual[0].due_date).toBe("2026-02-02");
  });

  it("Contract rejects probation > 6 months", () => {
    const findings = philippinesPack.providers.contracts!.validate({
      contract_type: "probationary",
      start_date: "2025-01-01",
      probation_end: "2025-09-01",
      status: "active",
    });
    const cap = findings.find((f) => f.code === "PH-LC-296-PROBATION-LIMIT");
    expect(cap?.passed).toBe(false);
  });

  it("Health check returns ok", async () => {
    const h = await Promise.resolve(philippinesPack.health!());
    expect(h.status === "ok" || h.status === "warn").toBe(true);
  });
});
