// H5/H6 — Core version + minimal semver range check + capability version check.
export const CORE_VERSION = "2.2.0";

function parse(v: string): [number, number, number] {
  const [a = "0", b = "0", c = "0"] = v.replace(/^[^\d]*/, "").split(".");
  return [parseInt(a, 10), parseInt(b, 10), parseInt(c, 10)];
}

function cmp(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** Supports ">=x.y.z", ">x.y.z", "=x.y.z", "^x.y.z" (compatible within major). */
export function satisfies(range: string, version: string): boolean {
  const v = parse(version);
  const r = range.trim();
  const m = r.match(/^(>=|>|=|\^)?\s*(\d+\.\d+\.\d+)$/);
  if (!m) return false;
  const op = m[1] ?? "=";
  const target = parse(m[2]);
  const c = cmp(v, target);
  switch (op) {
    case ">=":
      return c >= 0;
    case ">":
      return c > 0;
    case "=":
      return c === 0;
    case "^":
      return v[0] === target[0] && c >= 0;
    default:
      return false;
  }
}

/**
 * Capability compatibility (H6): provider `actual` is compatible with `expected`
 * iff same major AND actual.minor >= expected.minor. Accepts "x.y" or "x.y.z".
 */
export function capabilitySatisfies(expected: string, actual: string): boolean {
  const e = parse(expected);
  const a = parse(actual);
  if (a[0] !== e[0]) return false;
  if (a[1] < e[1]) return false;
  return true;
}
