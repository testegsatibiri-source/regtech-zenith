// H24 — statutory provenance invariants for the Philippines pack.
// Three levels, per the approved plan:
//   1. Presence — every PH_TABLES id has one statutorySources entry with all fields.
//   2. Linkage — an entry marked "official" is only valid if a matching
//      evidence file exists in docs/governance/legal-opinions/ (status is a
//      CONSEQUENCE of the file, never a label assigned beforehand).
//   3. Coherence — effectiveFrom is identical on both sides, and the evidence
//      header's Author and Reviewer are non-empty and strictly different.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PH_PARAMS } from "../params";
import { PH_TABLES } from "../constants";

const here = dirname(fileURLToPath(import.meta.url));
const OPINIONS_DIR = join(here, "../../../../docs/governance/legal-opinions");

interface EvidenceFile {
  name: string;
  tableId: string;
  effectiveFrom: string;
  author: string;
  reviewer: string;
}

const evidenceFiles: EvidenceFile[] = readdirSync(OPINIONS_DIR)
  .filter((f) => f.startsWith("PH-") && f.endsWith(".md"))
  .map((name) => {
    const text = readFileSync(join(OPINIONS_DIR, name), "utf8");
    const cell = (label: string) =>
      text.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*([^|]+?)\\s*\\|`))?.[1]?.trim() ?? "";
    return {
      name,
      tableId: cell("Table ID"),
      effectiveFrom: cell("effectiveFrom"),
      author: cell("Author"),
      reviewer: cell("Reviewer"),
    };
  });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("PH statutory provenance — presence", () => {
  it("every statutory table id has exactly one entry with all fields", () => {
    const ids = Object.values(PH_TABLES);
    const entries = PH_PARAMS.statutorySources;
    for (const id of ids) {
      const matches = entries.filter((e) => e.table === id);
      expect(matches, `missing or duplicated statutorySources entry for ${id}`).toHaveLength(1);
      const e = matches[0];
      expect(e.source.length, `${id}: empty source`).toBeGreaterThan(0);
      expect(e.effectiveFrom, `${id}: effectiveFrom must be ISO date`).toMatch(ISO_DATE);
      expect(["official", "needs-review", "stale"]).toContain(e.sourceStatus);
    }
    expect(entries).toHaveLength(ids.length);
  });
});

describe("PH statutory provenance — evidence linkage", () => {
  it("an entry may only be 'official' when a matching evidence file exists", () => {
    for (const e of PH_PARAMS.statutorySources) {
      if (e.sourceStatus !== "official") continue;
      const ev = evidenceFiles.find((f) => f.tableId === e.table);
      expect(ev, `no evidence file with Table ID ${e.table} (status '${e.sourceStatus}')`).toBeTruthy();
    }
  });

  it("every non-official entry names its follow-up ticket", () => {
    for (const e of PH_PARAMS.statutorySources) {
      if (e.sourceStatus === "official") continue;
      expect(e.notes ?? "", `${e.table}: needs-review/stale entry without a ticket`).toMatch(
        /DEBT-\d+/,
      );
    }
  });
});

describe("PH statutory provenance — coherence", () => {
  it("effectiveFrom is identical in params and in the evidence header", () => {
    for (const e of PH_PARAMS.statutorySources) {
      const ev = evidenceFiles.find((f) => f.tableId === e.table);
      if (!ev) continue; // linkage test covers the missing-file case
      expect(ev.effectiveFrom, `${e.table}: effectiveFrom mismatch with ${ev.name}`).toBe(
        e.effectiveFrom,
      );
    }
  });

  it("evidence files have distinct author and reviewer (independent sign-off)", () => {
    for (const f of evidenceFiles) {
      expect(f.author.length, `${f.name}: missing Author`).toBeGreaterThan(0);
      expect(f.reviewer.length, `${f.name}: missing Reviewer`).toBeGreaterThan(0);
      expect(f.author, `${f.name}: Author must differ from Reviewer`).not.toBe(f.reviewer);
    }
  });
});
