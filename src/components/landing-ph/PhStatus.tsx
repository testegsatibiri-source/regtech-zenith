import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { phStatusLabel, phStatusVariant } from "./statusLabels";

interface PackSnapshot {
  tier?: string;
  version?: string;
  rulesetVersion?: string;
}

export function PhStatus({ pack }: { pack: PackSnapshot }) {
  const { t } = useI18n();
  return (
    <section id="pagsunod" className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
          {t("ph.status.title")}
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">{t("ph.status.operational")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("ph.status.operational")}</span>
                <Badge variant={phStatusVariant(pack.tier ?? "")}>
                  {phStatusLabel(pack.tier ?? "")}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("ph.status.ruleset")}</span>
                <Badge variant="outline">{pack.rulesetVersion ?? "—"}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("ph.status.pack")}</span>
                <Badge variant="outline">{pack.version ?? "—"}</Badge>
              </div>
            </div>
            <p className="text-muted-foreground">{t("ph.status.body")}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
