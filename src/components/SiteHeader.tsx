import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui/button";

/**
 * Global shell header. Global surfaces are English-only by decision, so no
 * language toggle here — pack pages set their own locale via LocaleScope.
 */
export function SiteHeader() {
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
          <a
            href="/#platform"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Platform
          </a>
          <Link
            to="/packs"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Country Packs
          </Link>
          <Link
            to="/api-docs"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs &amp; API
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <a href="/#contact">Talk to us</a>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
