import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { idStatusLabel } from "@/components/landing-id/statusLabels";

const BANNED_MARKETING = [
  "Country Pack v1.0",
  '"v1.0"',
  "Production",
  "Validation",
  "AI Compliance",
  "end-to-end encryption",
  "end to end encryption",
];

describe("H17-ID landing route", () => {
  it("maps runtime pack statuses to Indonesian labels without hardcoded English marketing terms", () => {
    expect(idStatusLabel("production")).toBe("Produksi");
    expect(idStatusLabel("beta")).toBe("Dalam Validasi");
    expect(idStatusLabel("validation")).toBe("Dalam Validasi");
    expect(idStatusLabel("unknown")).toBe("Dalam Validasi");
  });

  it("does not prerender /id (loader is live and no prerender list includes it)", () => {
    const viteConfig = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");
    const hasPrerenderList = /prerender\s*:/.test(viteConfig) || /routes:\s*\[/.test(viteConfig);
    expect(hasPrerenderList).toBe(false);
  });

  it("does not contain banned hardcoded marketing strings in landing source files", () => {
    const dir = join(process.cwd(), "src/components/landing-id");
    const files = readdirSync(dir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    for (const file of files) {
      if (file === "statusLabels.ts") continue; // dynamic mapping is allowed
      const source = readFileSync(join(dir, file), "utf8");
      for (const term of BANNED_MARKETING) {
        expect(source, `${file} must not contain "${term}"`).not.toContain(term);
      }
    }
  });
});
