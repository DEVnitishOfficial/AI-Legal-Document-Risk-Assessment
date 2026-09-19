import type { ReactNode } from "react";

export const INPUT =
  "w-full px-3 py-2 rounded-lg text-sm bg-cream-50 dark:bg-navy-800 border border-cream-200 dark:border-white/10 text-navy-950 dark:text-cream-50 placeholder:text-gray-400 dark:placeholder:text-cream-100/30 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 disabled:opacity-60";

export const BTN_PRIMARY =
  "px-4 py-2 rounded-lg text-sm font-semibold bg-navy-900 text-cream-50 hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500";

export const BTN_GHOST =
  "px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-cream-100/70 border border-cream-200 dark:border-white/15 hover:border-gold-500 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500";

export const BTN_DANGER =
  "px-3 py-2 rounded-lg text-sm font-semibold text-risk-high-fg dark:text-risk-high-fg-dark border border-risk-high-fg/30 dark:border-risk-high-fg-dark/30 hover:bg-risk-high-bg dark:hover:bg-risk-high-bg-dark transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-cream-100/50 mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-400 dark:text-cream-100/40 mt-1">{hint}</span>}
    </label>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-5">
      <h3 className="font-display text-lg font-medium">{title}</h3>
      {description && <p className="text-xs text-gray-500 dark:text-cream-100/50 mt-0.5 mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  );
}

export const listToText = (list?: string[]) => (list || []).join(", ");
export const textToList = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
