// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig, type LovableViteTanstackOptions } from "@lovable.dev/vite-tanstack-config";

// BUILD_TARGET selects the deployment preset for external (non-Lovable) builds:
//   - unset / anything else: Lovable/Cloudflare default (nitro auto-detect).
//     Inside Lovable builds, LOVABLE_NITRO_PRESET pins Cloudflare regardless.
//   - "vercel": pin nitro's `vercel` preset for the GitHub Actions → Vercel pipeline.
// Rule (approved Etapa 1): BUILD_TARGET absent MUST mean Lovable/Cloudflare.
const buildTarget = process.env["BUILD_TARGET"];
const nitro: LovableViteTanstackOptions["nitro"] =
  buildTarget === "vercel" ? { preset: "vercel" } : undefined;

export default defineConfig({
  nitro,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
