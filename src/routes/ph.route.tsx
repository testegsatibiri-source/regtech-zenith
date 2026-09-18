import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { LocaleScope } from "@/lib/i18n";
import { PhNavbar } from "@/components/landing-ph/PhNavbar";
import { PhFooter } from "@/components/landing-ph/PhFooter";

export const Route = createFileRoute("/ph")({
  component: PhLayout,
});

function PhLayout() {
  useEffect(() => {
    document.documentElement.lang = "fil-PH";
    return () => {
      document.documentElement.lang = "en";
    };
  }, []);

  return (
    <LocaleScope lang="fil">
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <PhNavbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <PhFooter />
      </div>
    </LocaleScope>
  );
}
