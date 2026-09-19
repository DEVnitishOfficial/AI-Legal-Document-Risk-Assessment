const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 60 * 60],
  ["day", 60 * 60 * 24],
];

// "just now", "5 minutes ago", "1 hour ago", "yesterday" — falling back to a
// plain date after a week, where "23 days ago" stops being useful.
export function timeAgo(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds >= 60 * 60 * 24 * 7) return date.toLocaleDateString();

  for (let i = UNITS.length - 1; i >= 0; i--) {
    const [unit, size] = UNITS[i];
    if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}
