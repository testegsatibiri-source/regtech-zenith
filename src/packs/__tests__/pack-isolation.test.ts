// H24 — cross-pack isolation (generic, not aimed at any specific pair).
// No pack may import from another pack — neither by relative path escaping
// into a sibling folder nor via the "@/packs/<other>" alias. Packs may only
// import the SDK surface and their own modules.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const packs = readdirSync(PACKS_DIR).filter((d) => {
  try {
    return statSync(join(PACKS_DIR, d)).isDirectory() && d !== "__tests__";
  } catch {
    return false;
  }
});

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

const IMPORT_RE = /(?:import|export)[^"']*from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']/g;

describe("cross-pack isolation", () => {
  it("at least one pack exists to check", () => {
    expect(packs.length).toBeGreaterThan(0);
  });

  it("no pack imports another pack's modules", () => {
    const violations: string[] = [];
    for (const pack of packs) {
      const packDir = join(PACKS_DIR, pack);
      for (const file of walk(packDir)) {
        const src = readFileSync(file, "utf8");
        for (const m of src.matchAll(IMPORT_RE)) {
          const spec = m[1] ?? m[2];
          if (!spec) continue;
          for (const other of packs) {
            if (other === pack) continue;
            if (spec.startsWith(`@/packs/${other}/`) || spec === `@/packs/${other}`) {
              violations.push(`${relative(PACKS_DIR, file)} → ${spec}`);
              continue;
            }
            if (spec.startsWith(".")) {
              const resolved = resolve(dirname(file), spec);
              const rel = relative(PACKS_DIR, resolved);
              if (rel.split("/")[0] === other) {
                violations.push(`${relative(PACKS_DIR, file)} → ${spec} (resolves into ${other}/)`);
              }
            }
          }
        }
      }
    }
    expect(violations, `cross-pack imports found:\n${violations.join("\n")}`).toEqual([]);
  });
});
