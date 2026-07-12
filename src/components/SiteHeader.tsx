import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui/button";
import { LangToggle } from "./LangToggle";

export function SiteHeader() {
  const { t } = useI18n();
  const { user } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          UBoard<span className="text-accent">Asia</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <a href="/#product" className="text-muted-foreground transition-colors hover:text-foreground">{t("nav.product")}</a>
          <a href="/#pricing" className="text-muted-foreground transition-colors hover:text-foreground">{t("nav.pricing")}</a>
          <Link to="/calculator" className="text-muted-foreground transition-colors hover:text-foreground">{t("nav.calculator")}</Link>
        </nav>

        <div className="flex items-center gap-2">
          <LangToggle />
          {user ? (
            <Button asChild size="sm"><Link to="/dashboard">{t("nav.dashboard")}</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">{t("nav.signin")}</Link></Button>
              <Button asChild size="sm"><Link to="/auth">{t("hero.cta")}</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
