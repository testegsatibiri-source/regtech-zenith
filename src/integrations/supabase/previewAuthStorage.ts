// Supabase Auth session storage for non-Lovable environments.
// Lovable preview postMessage brokering is intentionally removed so the
// application owns its authentication session independently.
export function brokeredPreviewStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
