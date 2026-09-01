// H6 — Country Pack Test Kit (Conformance Suite).
// Each `runXxxSuite` exports a vitest `describe` block so pack authors can
// mount the whole conformance surface with a single import.
import { describe, expect, it } from "vitest";
import type { CountryPack } from "@/sdk";
import { validatePack } from "@/sdk";
import { EXPECTED_INTERFACES } from "@/sdk";
import type { TaxCase, BenefitsCase } from "./fixtures/ID";
import * as fs from "node:fs";
import * as path from "node:path";

/** Manifest / validator contract. */
export function runManifestSuite(pack: CountryPack): void {
  describe(`[${pack.manifest.country}] manifest`, () => {
    it("passes the Compatibility Validator", () => {
      const report = validatePack(pack);
      if (!report.ok) {
        // Surface every error to make CI diagnostics obvious.
        throw new Error(`Validator errors:\n - ${report.errors.join("\n - ")}`);
      }
      expect(report.ok).toBe(true);
    });

    it("declares provider `version` for every provided capability", () => {
      const provides = pack.manifest.provides ?? pack.manifest.engines ?? [];
      for (const cap of provides) {
        const key = capabilityKey(cap);
        if (!key) continue;
        const provider = (pack.providers as Record<string, { version?: string } | undefined>)[key];
        expect(provider?.version, `${key}.version`).toBeTruthy();
        const expected = EXPECTED_INTERFACES[cap];
        expect(expected, `EXPECTED_INTERFACES[${cap}]`).toBeTruthy();
      }
    });
  });
}

/** Tax provider contract. */
export function runTaxProviderSuite(pack: CountryPack, cases: TaxCase[]): void {
  describe(`[${pack.manifest.country}] TaxProvider`, () => {
    const tax = pack.providers.tax;
    if (!tax) {
      it.skip("no TaxProvider — skipping", () => void 0);
      return;
    }

    for (const c of cases) {
      it(c.name, () => {
        const out = tax.calculate(c.input);
        if (c.expected.rate !== undefined) expect(out.rate).toBeCloseTo(c.expected.rate, 4);
        if (c.expected.category !== undefined) expect(out.category).toBe(c.expected.category);
        if (c.expected.taxMin !== undefined)
          expect(out.tax).toBeGreaterThanOrEqual(c.expected.taxMin);
        if (c.expected.taxMax !== undefined) expect(out.tax).toBeLessThanOrEqual(c.expected.taxMax);
        if (c.input.hasNpwp === false) expect(out.surcharge).toBeGreaterThan(0);
        if (c.input.hasNpwp === true && c.input.monthlyGross > 0 && out.rate > 0) {
          expect(out.surcharge).toBe(0);
        }
      });
    }
  });
}

/** Benefits provider contract. */
export function runBenefitsProviderSuite(pack: CountryPack, cases: BenefitsCase[]): void {
  describe(`[${pack.manifest.country}] BenefitsProvider`, () => {
    const b = pack.providers.benefits;
    if (!b) {
      it.skip("no BenefitsProvider — skipping", () => void 0);
      return;
    }
    for (const c of cases) {
      it(c.name, () => {
        const out = b.calculate(c.input);
        expect(out.employee.total).toBeGreaterThanOrEqual(0);
        expect(out.employer.total).toBeGreaterThanOrEqual(0);
        if (c.expected.employeeTotalGt !== undefined) {
          expect(out.employee.total).toBeGreaterThan(c.expected.employeeTotalGt);
        }
        if (c.expected.employerTotalGt !== undefined) {
          expect(out.employer.total).toBeGreaterThan(c.expected.employerTotalGt);
        }
      });
    }
  });
}

/**
 * Isolation heuristic. Reads the pack's source directory and asserts no file
 * imports from another `src/packs/<other>/`. Skips silently if the pack path
 * cannot be inferred (e.g. running in a bundle).
 */
export function runIsolationSuite(pack: CountryPack, packDir: string): void {
  describe(`[${pack.manifest.country}] isolation`, () => {
    it("does not import another country pack's internals", () => {
      const offenders: string[] = [];
      walk(packDir, (file) => {
        if (!/\.tsx?$/.test(file)) return;
        const src = fs.readFileSync(file, "utf8");
        const re = /from ["']@\/packs\/([a-z-]+)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(src))) {
          const owner = path.basename(path.dirname(packDir));
          const target = m[1];
          if (target !== path.basename(packDir) && target !== owner) {
            offenders.push(`${path.relative(process.cwd(), file)} → @/packs/${target}`);
          }
        }
      });
      expect(offenders, `Cross-pack imports:\n${offenders.join("\n")}`).toHaveLength(0);
    });
  });
}

function walk(dir: string, visit: (file: string) => void): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full);
  }
}

function capabilityKey(cap: string): string | null {
  const map: Record<string, string> = {
    tax: "tax",
    benefits: "benefits",
    payroll: "payroll",
    thirteenth: "thirteenth",
    calendar: "calendar",
    contracts: "contracts",
    rules: "rules",
    audit: "audit",
  };
  return map[cap] ?? null;
}

export { ID_TAX_CASES, ID_BENEFITS_CASES } from "./fixtures/ID";
