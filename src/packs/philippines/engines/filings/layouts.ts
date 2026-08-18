// PH filing layout primitives — pure string builders, no I/O.

export const csvEscape = (v: unknown): string => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const csvRow = (cells: unknown[]): string => cells.map(csvEscape).join(",");

export const money = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);

export const digits = (v: unknown): string => String(v ?? "").replace(/\D/g, "");

/** Fixed-width left-aligned text field (SSS/Pag-IBIG text layouts). */
export const padText = (v: unknown, width: number): string =>
  String(v ?? "").toUpperCase().slice(0, width).padEnd(width, " ");

/** Fixed-width right-aligned numeric field in centavos, zero-filled. */
export const padAmount = (n: number, width: number): string =>
  String(Math.round(Math.max(0, n) * 100)).padStart(width, "0");

export const monthLabel = (year: number, month?: number): string =>
  month ? `${year}${String(month).padStart(2, "0")}` : String(year);

/** Split a registered full name into BIR-style LAST, FIRST, MIDDLE parts. */
export function splitName(fullName: string): { last: string; first: string; middle: string } {
  const clean = fullName.trim().replace(/\s+/g, " ");
  if (clean.includes(",")) {
    const [last, rest = ""] = clean.split(",");
    const parts = rest.trim().split(" ");
    return {
      last: (last ?? "").trim().toUpperCase(),
      first: (parts.slice(0, -1).join(" ") || parts[0] || "").toUpperCase(),
      middle: (parts.length > 1 ? parts[parts.length - 1]! : "").toUpperCase(),
    };
  }
  const parts = clean.split(" ");
  if (parts.length === 1) return { last: parts[0]!.toUpperCase(), first: "", middle: "" };
  const last = parts[parts.length - 1]!.toUpperCase();
  const first = parts[0]!.toUpperCase();
  const middle = parts.slice(1, -1).join(" ").toUpperCase();
  return { last, first, middle };
}
