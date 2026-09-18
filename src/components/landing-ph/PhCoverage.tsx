import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PhCoverage() {
  const { t } = useI18n();
  const items = [
    { title: t("ph.coverage.contrib.title"), body: t("ph.coverage.contrib.body") },
    { title: t("ph.coverage.tax.title"), body: t("ph.coverage.tax.body") },
    { title: t("ph.coverage.thirteenth.title"), body: t("ph.coverage.thirteenth.body") },
    { title: t("ph.coverage.leave.title"), body: t("ph.coverage.leave.body") },
    { title: t("ph.coverage.separation.title"), body: t("ph.coverage.separation.body") },
    { title: t("ph.coverage.filings.title"), body: t("ph.coverage.filings.body") },
  ];
  return (
    <section id="platform" className="bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
          {t("ph.coverage.title")}
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.title} className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
