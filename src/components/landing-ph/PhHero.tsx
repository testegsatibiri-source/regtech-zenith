import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PhHero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden px-4 py-20 md:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="outline" className="mb-6">
          {t("ph.hero.badge")}
        </Badge>
        <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">{t("ph.hero.title")}</h1>
        <p className="mx-auto mb-10 max-w-3xl text-lg text-muted-foreground md:text-xl">
          {t("ph.hero.sub")}
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <a href="#form">{t("ph.hero.ctaPrimary")}</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/packs/$country" params={{ country: "PH" }}>
              {t("ph.hero.ctaSecondary")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
