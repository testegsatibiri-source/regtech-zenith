import { useI18n } from "@/lib/i18n";

/** Language switcher. Renders nothing when the scope offers a single language. */
export function LangToggle() {
  const { lang, setLang, available } = useI18n();
  if (available.length < 2) return null;
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border text-xs font-semibold">
      {available.map((l) => (
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
