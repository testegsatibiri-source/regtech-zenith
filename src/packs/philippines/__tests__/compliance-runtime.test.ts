// DEBT-019 regression — compliance engine must honor the country code and
// resolve rules from the SDK Runtime (not the retired ID-hardcoded bridge).
import { describe, expect, it } from "vitest";
import "@/sdk/bootstrap";
import { CountryRuntime } from "@/sdk";
import { evaluateCompany } from "@/lib/engines/compliance";
import type { EmployeeLike } from "@/lib/engines/types";

const emps: EmployeeLike[] = [
  { full_name: "Juan Dela Cruz", base_salary: 25_000, country_metadata: {} },
];

describe("compliance.evaluateCompany multi-country", () => {
  it("uses PH ruleset when code = PH", () => {
    const ph = CountryRuntime.get("PH");
    const report = evaluateCompany(emps, "PH");
    expect(report.rulesetVersion).toBe(ph.manifest.rulesetVersion);
    expect(report.rulesetVersion).not.toMatch(/^ID-/);
  });

  it("uses ID ruleset by default", () => {
    const id = CountryRuntime.get("ID");
    const report = evaluateCompany(emps);
    expect(report.rulesetVersion).toBe(id.manifest.rulesetVersion);
    expect(report.rulesetVersion).toMatch(/^ID-/);
  });
});
