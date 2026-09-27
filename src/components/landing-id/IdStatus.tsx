import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { idStatusLabel, idStatusVariant } from "./statusLabels";
import { GateSummary } from "@/components/assurance/GateSummary";
import { evaluateId } from "@/lib/assurance/registers/id";

interface PackSnapshot {
  tier?: string;
  version?: string;
  rulesetVersion?: string;
}

export function IdStatus({ pack }: { pack: PackSnapshot }) {
  const { t } = useI18n();
  return (
    <section id="kepatuhan" className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
          {t("id.status.title")}
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">{t("id.status.operational")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("id.status.operational")}</span>
                <Badge variant={idStatusVariant(pack.tier ?? "")}>
                  {idStatusLabel(pack.tier ?? "")}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("id.status.ruleset")}</span>
                <Badge variant="outline">{pack.rulesetVersion ?? "—"}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("id.status.pack")}</span>
                <Badge variant="outline">{pack.version ?? "—"}</Badge>
              </div>
            </div>
            <p className="text-muted-foreground">{t("id.status.body")}</p>
            <GateSummary evaluation={evaluateId(new Date().toISOString().slice(0, 10))} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
