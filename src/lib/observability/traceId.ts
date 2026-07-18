// H4 — Correlation id helper.
export function newTraceId(): string {
  // 128-bit random hex; cheap, stable, no deps.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function traceIdFromRequest(req: Request): string {
  return req.headers.get("x-request-id") ?? newTraceId();
}
