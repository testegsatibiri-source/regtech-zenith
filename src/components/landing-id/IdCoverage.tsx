import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IdCoverage() {
  const { t } = useI18n();
  const items = [
    { title: t("id.coverage.pph21.title"), body: t("id.coverage.pph21.body") },
    { title: t("id.coverage.bpjs.title"), body: t("id.coverage.bpjs.body") },
    { title: t("id.coverage.separation.title"), body: t("id.coverage.separation.body") },
    { title: t("id.coverage.thr.title"), body: t("id.coverage.thr.body") },
    { title: t("id.coverage.overtime.title"), body: t("id.coverage.overtime.body") },
    { title: t("id.coverage.privacy.title"), body: t("id.coverage.privacy.body") },
  ];
  return (
    <section id="platform" className="bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
          {t("id.coverage.title")}
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
