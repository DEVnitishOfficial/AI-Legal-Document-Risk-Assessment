import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, ExternalLink } from "lucide-react";
import type { SourcePassage, Turn } from "./consultationApi";

// Every provision the advocate looked up during the call, de-duplicated, with
// a link to the official document it came from.
export default function SourcesPanel({ turns }: { turns: Turn[] }) {
  const [open, setOpen] = useState<string | null>(null);

  const sources = useMemo(() => {
    const seen = new Map<string, SourcePassage>();
    for (const t of turns) {
      if (t.kind !== "SEARCH" || !Array.isArray(t.citations)) continue;
      for (const p of t.citations as SourcePassage[]) if (!seen.has(p.citation)) seen.set(p.citation, p);
    }
    return [...seen.values()];
  }, [turns]);

  if (sources.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-cream-100/50 p-4">
        When the advocate looks up the law, the provisions it found — with a link to the official text — are listed here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cream-200 dark:divide-white/10">
      {sources.map((s) => (
        <li key={s.citation} className="p-3">
          <button
            onClick={() => setOpen(open === s.citation ? null : s.citation)}
            aria-expanded={open === s.citation}
            className="w-full flex items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
          >
            <BookOpenCheck size={15} className="shrink-0 text-gold-600 dark:text-gold-400" />
            <span className="font-semibold text-[13.5px] flex-1">{s.citation}</span>
            <ChevronDown size={14} className={`shrink-0 transition-transform ${open === s.citation ? "rotate-180" : ""}`} />
          </button>
          {open === s.citation && (
            <div className="mt-2 pl-6">
              <p className="text-[12.5px] leading-relaxed text-gray-600 dark:text-cream-100/70 whitespace-pre-line">
                {s.excerpt}
                {s.excerpt.length >= 500 ? "…" : ""}
              </p>
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold-600 dark:text-gold-400 hover:underline"
              >
                Official text{s.sourceDomain ? ` · ${s.sourceDomain}` : ""} <ExternalLink size={12} />
              </a>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
