import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface IntroPoint {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface PageIntroProps {
  /** Unique per page — remembers whether the visitor collapsed the guide. */
  storageKey: string;
  eyebrow: string;
  title: string;
  description: string;
  points: IntroPoint[];
}

const readCollapsed = (key: string) => {
  try {
    return localStorage.getItem(key) === "collapsed";
  } catch {
    return false;
  }
};

// Header + "what is this page for" guide shown at the top of every app
// section. Open by default so a new user sees it; collapsible so it doesn't
// take space once they know their way around.
export default function PageIntro({ storageKey, eyebrow, title, description, points }: PageIntroProps) {
  const key = `intro:${storageKey}`;
  const [collapsed, setCollapsed] = useState(() => readCollapsed(key));

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(key, next ? "collapsed" : "open");
    } catch {
      // Storage unavailable — the toggle still works for this visit.
    }
  };

  return (
    <div className="px-6 pt-5 pb-4 border-b border-cream-200 dark:border-white/10 shrink-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-gold-600 dark:text-gold-400">
            {eyebrow}
          </span>
          <h1 className="font-display text-2xl font-medium mt-1 text-balance">{title}</h1>
        </div>

        <button
          onClick={toggle}
          aria-expanded={!collapsed}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-cream-100/50 hover:text-navy-950 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-cream-100 dark:hover:bg-navy-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
        >
          <HelpCircle size={14} />
          {collapsed ? "How this works" : "Hide guide"}
          <ChevronDown size={14} className={`transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </div>

      {!collapsed && (
        <>
          <p className="text-sm text-gray-600 dark:text-cream-100/60 leading-relaxed mt-2 max-w-3xl">
            {description}
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            {points.map((p) => (
              <div
                key={p.title}
                className="flex gap-3 rounded-lg bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 p-3"
              >
                <span className="w-8 h-8 shrink-0 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-600 dark:text-gold-400">
                  <p.icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{p.title}</p>
                  <p className="text-xs text-gray-500 dark:text-cream-100/50 leading-relaxed mt-0.5">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
