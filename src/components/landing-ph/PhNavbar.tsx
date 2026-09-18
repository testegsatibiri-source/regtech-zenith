import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui/button";

export function PhNavbar() {
  const { t } = useI18n();
  const { user } = useSession();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a href="/ph" className="font-semibold tracking-tight">
          UBoard Asia
        </a>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#platform" className="text-muted-foreground hover:text-foreground">
            {t("ph.nav.platform")}
          </a>
          <a href="#pagsunod" className="text-muted-foreground hover:text-foreground">
            {t("ph.nav.compliance")}
          </a>
          <a href="#api" className="text-muted-foreground hover:text-foreground">
            {t("ph.nav.api")}
          </a>
          <a href="#kontak" className="text-muted-foreground hover:text-foreground">
            {t("ph.nav.contact")}
          </a>
        </nav>
        <Button asChild size="sm" variant={user ? "default" : "outline"}>
          {user ? (
            <Link to="/dashboard">{t("ph.nav.dashboard")}</Link>
          ) : (
            <Link to="/auth">{t("ph.nav.signin")}</Link>
          )}
        </Button>
      </div>
    </header>
  );
}
