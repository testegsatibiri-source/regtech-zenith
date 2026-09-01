// H13 — Explicit indexing manifest (refinement 3).
// Uses Vite's import.meta.glob so contents are frozen at build time —
// the Cloudflare Worker has no arbitrary runtime filesystem access.
// Client-safe: pure data, no server-only imports.

export const MANIFEST_GLOBS = [
  "src/lib/**",
  "src/routes/**",
  "src/components/**",
  "src/hooks/**",
  "src/providers/**",
  "src/services/**",
  "src/contexts/**",
  "supabase/migrations/**",
  "docs/**",
] as const;

// Eagerly-loaded manifests. Vite resolves these at build time; each entry is
// { "/absolute/path.ts": "raw source string" }.
const SRC_LIB = import.meta.glob("/src/lib/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const SRC_ROUTES = import.meta.glob("/src/routes/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const SRC_COMPONENTS = import.meta.glob("/src/components/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const SRC_HOOKS = import.meta.glob("/src/hooks/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const SRC_PROVIDERS = import.meta.glob("/src/providers/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const SRC_SERVICES = import.meta.glob("/src/services/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const SRC_CONTEXTS = import.meta.glob("/src/contexts/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const MIGRATIONS = import.meta.glob("/supabase/migrations/**/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const DOCS = import.meta.glob("/docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface ManifestEntry {
  path: string; // repo-relative (e.g. "src/lib/uada/index.ts")
  content: string;
  kind:
    | "code"
    | "route"
    | "component"
    | "hook"
    | "provider"
    | "service"
    | "context"
    | "migration"
    | "doc";
}

function toEntries(record: Record<string, string>, kind: ManifestEntry["kind"]): ManifestEntry[] {
  return Object.entries(record).map(([abs, content]) => ({
    path: abs.replace(/^\//, ""),
    content,
    kind,
  }));
}

export function collectManifest(): ManifestEntry[] {
  return [
    ...toEntries(SRC_LIB, "code"),
    ...toEntries(SRC_ROUTES, "route"),
    ...toEntries(SRC_COMPONENTS, "component"),
    ...toEntries(SRC_HOOKS, "hook"),
    ...toEntries(SRC_PROVIDERS, "provider"),
    ...toEntries(SRC_SERVICES, "service"),
    ...toEntries(SRC_CONTEXTS, "context"),
    ...toEntries(MIGRATIONS, "migration"),
    ...toEntries(DOCS, "doc"),
  ];
}

/** PII denylist — content of these tables/schemas must never be indexed. Only structure is allowed. */
export const PII_DENYLIST = [
  "payroll_items",
  "employees",
  "employment_contracts",
  "auth.",
  "storage.",
] as const;
