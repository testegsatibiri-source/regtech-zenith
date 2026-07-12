import { useI18n } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border text-xs font-semibold">
      {(["en", "id"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={
            "px-2.5 py-1 transition-colors " +
            (lang === l ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted")
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
