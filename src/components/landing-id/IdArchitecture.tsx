import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IdArchitecture() {
  const { t } = useI18n();
  const items = [
    { title: t("id.architecture.core.title"), body: t("id.architecture.core.body") },
    { title: t("id.architecture.pack.title"), body: t("id.architecture.pack.body") },
    { title: t("id.architecture.audit.title"), body: t("id.architecture.audit.body") },
  ];
  return (
    <section id="api" className="bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
          {t("id.architecture.title")}
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
