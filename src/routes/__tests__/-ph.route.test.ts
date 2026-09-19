import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { phStatusLabel } from "@/components/landing-ph/statusLabels";

const BANNED_MARKETING = [
  "Country Pack v1.0",
  '"v1.0"',
  "AI ",
  "PH-2024",
  "end-to-end encryption",
  "end to end encryption",
  "automatic submission",
  "awtomatikong pagsusumite",
];

describe("H25-PH landing route", () => {
  it("maps runtime pack statuses to Filipino labels", () => {
    expect(phStatusLabel("production")).toBe("Nasa Produksyon");
    expect(phStatusLabel("beta")).toBe("Nasa Validation");
    expect(phStatusLabel("validation")).toBe("Nasa Validation");
    expect(phStatusLabel("unavailable")).toBe("Hindi available ang status");
    expect(phStatusLabel("whatever")).toBe("Nasa Validation");
  });

  it("does not hardcode banned marketing or ruleset strings in landing source files", () => {
    const dir = join(process.cwd(), "src/components/landing-ph");
    const files = readdirSync(dir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    for (const file of files) {
      if (file === "statusLabels.ts") continue; // dynamic mapping is allowed
      const source = readFileSync(join(dir, file), "utf8");
      for (const term of BANNED_MARKETING) {
        expect(source, `${file} must not contain "${term}"`).not.toContain(term);
      }
    }
  });

  it("does not import anything from the Indonesia landing", () => {
    const dir = join(process.cwd(), "src/components/landing-ph");
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), "utf8");
      expect(source, `${file} must not import landing-id`).not.toContain("landing-id");
    }
  });
});
