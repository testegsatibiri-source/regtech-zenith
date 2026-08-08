import { Check } from "lucide-react";
import { CountryFlag } from "@/components/packs/CountryFlag";
import type { AvailablePack } from "@/lib/packs/onboarding-contract";

/**
 * H18.2 — pure presentation. It renders exactly the packs it receives and
 * holds no business rule: availability is decided by
 * loadCountryPacksForRequest() before the component ever runs.
 */
export function CountryPackSelector({
  packs,
  value,
  onSelect,
}: {
  packs: AvailablePack[];
  value: string | null;
  onSelect: (countryCode: string) => void;
}) {
  if (packs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No country pack is available right now. Please try again shortly.
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label="Country pack" className="grid gap-3 sm:grid-cols-2">
      {packs.map((p) => {
        const selected = value === p.countryCode;
        return (
          <button
            key={p.countryCode}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(p.countryCode)}
            className={
              "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors " +
              (selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted/50")
            }
          >
            <CountryFlag code={p.countryCode} name={p.name} className="h-7 w-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{p.name}</span>
              <span className="block text-xs text-muted-foreground">
                {p.name} · {p.currency}
              </span>
            </span>
            {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
