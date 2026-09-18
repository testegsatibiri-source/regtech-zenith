import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PhArchitecture() {
  const { t } = useI18n();
  const items = [
    { title: t("ph.architecture.core.title"), body: t("ph.architecture.core.body") },
    { title: t("ph.architecture.pack.title"), body: t("ph.architecture.pack.body") },
    { title: t("ph.architecture.audit.title"), body: t("ph.architecture.audit.body") },
  ];
  return (
    <section id="api" className="bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
          {t("ph.architecture.title")}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
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
