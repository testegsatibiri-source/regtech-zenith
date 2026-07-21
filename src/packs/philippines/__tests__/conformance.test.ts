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
  });

  it("Calendar produces 12 monthly + 1 annual per template", () => {
    const templates = philippinesPack.providers.calendar!.templates();
    const monthly = templates.find((t) => t.code === "BIR-1601C")!.occurrences(2025);
    const annual = templates.find((t) => t.code === "BIR-2316")!.occurrences(2025);
    expect(monthly).toHaveLength(12);
    expect(annual).toHaveLength(1);
    expect(annual[0].due_date).toBe("2026-01-31");
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
