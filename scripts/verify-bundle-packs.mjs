// Artifact-level regression guard (run after `bun run build`).
// Loads the built SSR catalog chunk and asserts the country packs are still
// registered in the real bundle — dev-mode tests cannot catch tree-shaking.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "dist/server/_ssr");
const files = readdirSync(dir);
const catalog = files.find((f) => /^catalog-.*\.mjs$/.test(f));
if (!catalog) {
  console.error("verify-bundle-packs: catalog chunk not found in", dir);
  process.exit(1);
}

const source = readFileSync(join(dir, catalog), "utf8");
if (!/bootstrapPacks\s*\(\s*\)/.test(source)) {
  console.error(
    `verify-bundle-packs: ${catalog} does not call bootstrapPacks() — packs would be missing in production.`,
  );
  process.exit(1);
}

const mod = await import(join(dir, catalog));
const listWithHealth = Object.values(mod).find(
  (v) => typeof v === "function" && v.constructor.name === "AsyncFunction",
);
const entries = await listWithHealth();
const missing = ["ID", "MY", "PH"].filter(
  (code) => !entries.some((e) => e.code === code && e.tier !== "roadmap"),
);
if (missing.length) {
  console.error("verify-bundle-packs: packs missing from built catalog:", missing.join(", "));
  process.exit(1);
}
console.log(
  "verify-bundle-packs: OK —",
  entries.map((e) => `${e.code}:${e.tier}`).join(" "),
);
