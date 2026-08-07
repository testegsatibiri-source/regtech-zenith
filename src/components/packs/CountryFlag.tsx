/**
 * Country flag as an image (flagcdn) instead of an emoji — emoji flags do not
 * render on Windows/Chrome. Presentation only.
 */
export function CountryFlag({
  code,
  name,
  className = "h-6 w-9",
}: {
  code: string;
  name: string;
  className?: string;
}) {
  const iso = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      srcSet={`https://flagcdn.com/w160/${iso}.png 2x`}
      width={80}
      height={60}
      loading="lazy"
      alt={`${name} flag`}
      className={`${className} rounded-sm object-cover shadow-sm ring-1 ring-border`}
    />
  );
}
