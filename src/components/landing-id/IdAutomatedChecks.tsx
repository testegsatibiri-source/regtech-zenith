import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IdValidation() {
  const { t } = useI18n();
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {t("id.validation.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t("id.validation.body")}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
