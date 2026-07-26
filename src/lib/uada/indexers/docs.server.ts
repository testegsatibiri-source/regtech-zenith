// H13 — Docs & migrations indexer. Server-only.
import { collectManifest } from "./manifest";

export interface DocDoc {
  path: string;
  kind: "adr" | "doc" | "migration";
  sha256Input: string;
  summary: string;
  content: string;
}

export function indexDocs(): DocDoc[] {
  const entries = collectManifest().filter((e) => e.kind === "doc" || e.kind === "migration");
  return entries.map((entry) => {
    const isAdr = /\/ADR-|\/adr-/i.test("/" + entry.path);
    const kind: DocDoc["kind"] =
      entry.kind === "migration" ? "migration" : isAdr ? "adr" : "doc";
    return {
      path: entry.path,
      kind,
      sha256Input: entry.content,
      summary: firstHeading(entry.content) ?? firstNonBlankLine(entry.content, 200),
      content: entry.content,
    };
  });
}

function firstHeading(content: string): string | null {
  const line = content.split("\n").find((l) => /^\s*#\s+/.test(l));
  return line ? line.replace(/^\s*#\s+/, "").trim().slice(0, 200) : null;
}

function firstNonBlankLine(content: string, max: number): string {
  const line = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.trim().slice(0, max);
}
