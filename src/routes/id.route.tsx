import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { LocaleScope } from "@/lib/i18n";
import { IdNavbar } from "@/components/landing-id/IdNavbar";
import { IdFooter } from "@/components/landing-id/IdFooter";

export const Route = createFileRoute("/id")({
  component: IdLayout,
});

function IdLayout() {
  useEffect(() => {
    document.documentElement.lang = "id-ID";
    return () => {
      document.documentElement.lang = "en";
    };
  }, []);

  return (
    <LocaleScope lang="id">
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <IdNavbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <IdFooter />
      </div>
    </LocaleScope>
  );
}
