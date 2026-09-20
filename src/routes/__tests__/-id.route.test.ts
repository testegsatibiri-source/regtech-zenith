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

  it("does not leak Portuguese text into id/fil dictionary entries", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/i18n.tsx"), "utf8");
    const localizedLines = source.split("\n").filter((l) => /^\s*(id|fil):\s*"/.test(l));
    expect(localizedLines.length).toBeGreaterThan(0);
    // PT-BR markers absent from Bahasa Indonesia and Filipino:
    // ã/õ/ç diacritics plus common PT-only words.
    const PT_PATTERN = /[ãõç]|\b(cada|contendo|através|então|agora|você|não|só)\b/i;
    for (const line of localizedLines) {
      expect(line, `dictionary line must not contain Portuguese: ${line.trim()}`).not.toMatch(PT_PATTERN);
    }
  });
});
