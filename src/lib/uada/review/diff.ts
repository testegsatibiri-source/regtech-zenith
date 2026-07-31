// H15 — Minimal unified-diff parser. Pure, deterministic, no I/O.
// Only what the review rules need: per-file added/removed lines with line numbers.

export interface DiffLine {
  /** 1-based line number in the NEW file. Undefined for removed lines. */
  line?: number;
  content: string;
}

export interface DiffFile {
  /** Path in the new tree ("/dev/null" when deleted). */
  path: string;
  oldPath: string;
  status: "added" | "modified" | "deleted" | "renamed";
  added: DiffLine[];
  removed: DiffLine[];
}

export interface ParsedDiff {
  files: DiffFile[];
  additions: number;
  deletions: number;
}

function strip(p: string): string {
  return p.replace(/^[ab]\//, "").trim();
}

export function parseUnifiedDiff(diff: string): ParsedDiff {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  let newLine = 0;

  const push = () => {
    if (current) files.push(current);
  };

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("diff --git")) {
      push();
      const m = raw.match(/diff --git a\/(\S+) b\/(\S+)/);
      const oldPath = m ? m[1] : "unknown";
      const path = m ? m[2] : "unknown";
      current = {
        path,
        oldPath,
        status: oldPath !== path ? "renamed" : "modified",
        added: [],
        removed: [],
      };
      newLine = 0;
      continue;
    }
    if (!current) continue;

    if (raw.startsWith("new file mode")) current.status = "added";
    else if (raw.startsWith("deleted file mode")) current.status = "deleted";
    else if (raw.startsWith("--- ")) {
      const p = strip(raw.slice(4));
      if (p !== "/dev/null") current.oldPath = p;
    } else if (raw.startsWith("+++ ")) {
      const p = strip(raw.slice(4));
      if (p !== "/dev/null") current.path = p;
    } else if (raw.startsWith("@@")) {
      const m = raw.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      newLine = m ? Number(m[1]) : 1;
    } else if (raw.startsWith("+")) {
      current.added.push({ line: newLine, content: raw.slice(1) });
      newLine += 1;
    } else if (raw.startsWith("-")) {
      current.removed.push({ content: raw.slice(1) });
    } else if (raw.startsWith(" ")) {
      newLine += 1;
    }
  }
  push();

  return {
    files,
    additions: files.reduce((n, f) => n + f.added.length, 0),
    deletions: files.reduce((n, f) => n + f.removed.length, 0),
  };
}
