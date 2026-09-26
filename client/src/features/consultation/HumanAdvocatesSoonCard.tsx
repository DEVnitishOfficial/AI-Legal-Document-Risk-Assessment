import { UserRound } from "lucide-react";

// Stands in for the human advocates until any are listed, in the same shape as
// AdvocateCard so the two sit side by side in one row.
export default function HumanAdvocatesSoonCard() {
  return (
    <article className="rounded-xl border border-dashed border-cream-200 dark:border-white/15 bg-white/50 dark:bg-navy-900/50 p-5 flex flex-col gap-3.5">
      <p className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40">Human advocates</p>

      <header className="flex items-start gap-3.5">
        <span className="w-12 h-12 shrink-0 rounded-full border-2 border-dashed border-gold-500/60 text-gold-500 flex items-center justify-center">
          <UserRound size={22} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[17px] font-medium leading-tight">Speak to a real lawyer</h3>
            <span className="rounded-full bg-cream-100 dark:bg-navy-800 border border-cream-200 dark:border-white/10 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-cream-100/70">
              Coming soon
            </span>
          </div>
          <p className="text-[13px] text-gray-600 dark:text-cream-100/60 mt-0.5">
            Verified advocates, enrolled with their State Bar Council, with their degrees, courts and languages listed.
          </p>
        </div>
      </header>

      <div className="mt-auto pt-1">
        <button
          disabled
          className="w-full rounded-lg border border-cream-200 dark:border-white/10 text-gray-400 dark:text-cream-100/40 font-medium text-sm py-2.5 cursor-not-allowed"
        >
          Coming soon
        </button>
      </div>
    </article>
  );
}
