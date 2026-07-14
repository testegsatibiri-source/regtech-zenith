import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API Reference — UBoard Asia Calculation Engine" },
      {
        name: "description",
        content:
          "Interactive Swagger/OpenAPI reference for UBoard Asia's public payroll calculation API: PPh 21 (TER) and BPJS engines for Indonesia.",
      },
      { property: "og:title", content: "API Reference — UBoard Asia" },
      {
        property: "og:description",
        content: "PPh 21 (TER) and BPJS calculation endpoints — request/response examples and a live try-it console.",
      },
    ],
    links: [
      { rel: "stylesheet", href: "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" },
    ],
  }),
  component: ApiDocsPage,
});

function ApiDocsPage() {
  useEffect(() => {
    const scriptId = "swagger-ui-bundle";
    function render() {
      const w = window as unknown as { SwaggerUIBundle?: (opts: Record<string, unknown>) => void };
      if (!w.SwaggerUIBundle) return;
      w.SwaggerUIBundle({
        url: "/api/public/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        tryItOutEnabled: true,
      });
    }
    if (document.getElementById(scriptId)) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js";
    script.crossOrigin = "anonymous";
    script.onload = render;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">API Reference</h1>
          <p className="mt-2 text-muted-foreground">
            Public calculation engines for the UBoard Asia API-as-a-Service. Spec:{" "}
            <a className="underline" href="/api/public/openapi.json">
              /api/public/openapi.json
            </a>
          </p>
        </div>
        <div className="rounded-lg border bg-white p-2">
          <div id="swagger-ui" />
        </div>
      </div>
    </div>
  );
}
