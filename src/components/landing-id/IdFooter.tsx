import { useI18n } from "@/lib/i18n";

export function IdFooter() {
  const { t } = useI18n();
  return (
    <footer id="kontak" className="border-t px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm font-medium">UBoard Asia</p>
          <p className="text-sm text-muted-foreground">{t("id.footer.tagline")}</p>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} UBoard Asia. {t("id.footer.tagline")}
        </p>
      </div>
    </footer>
  );
}
