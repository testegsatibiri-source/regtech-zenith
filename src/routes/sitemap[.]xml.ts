import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listCatalogWithHealth } from "@/lib/packs/catalog";
import { hasCalculator } from "@/lib/packs/calculators";

import "@/sdk/bootstrap";

const BASE_URL = "https://id-preview--46ec53e1-c4ac-415d-911a-f979dd409603.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const catalog = await listCatalogWithHealth();
        const productionPacks = catalog.filter((p) => p.tier === "production");
        const packEntries: SitemapEntry[] = productionPacks.flatMap((p) => {
          const slug = p.code.toLowerCase();
          const entries: SitemapEntry[] = [
            { path: `/packs/${slug}`, changefreq: "weekly" as const, priority: "0.9" },
          ];
          if (hasCalculator(p.code)) {
            entries.push({
              path: `/packs/${slug}/calculator`,
              changefreq: "monthly" as const,
              priority: "0.8",
            });
          }
          return entries;
        });

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/packs", changefreq: "weekly", priority: "0.9" },
          ...packEntries,
          { path: "/auth", changefreq: "yearly", priority: "0.3" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
