import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import type { CitationStatus, Turn } from "./consultationApi";

const formatAt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const CITATION_TEXT: Record<CitationStatus, string> = {
  verified: "confirmed from the official text",
  unverified_not_retrieved: "not confirmed from the sources",
  unverified_act_not_loaded: "this Act isn't in the knowledge base",
};

function CitationChips({ citations }: { citations: any[] }) {
  if (!citations?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5 mt-2" aria-label="Provisions mentioned">
      {citations.map((c, i) => {
        const ok = c.status === "verified";
        return (
          <li
            key={`${c.actShort}-${c.section}-${i}`}
            title={CITATION_TEXT[c.status as CitationStatus] ?? c.status}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              ok
                ? "bg-risk-low-bg dark:bg-risk-low-bg-dark text-risk-low-fg dark:text-risk-low-fg-dark"
                : "bg-risk-med-bg dark:bg-risk-med-bg-dark text-risk-med-fg dark:text-risk-med-fg-dark"
            }`}
          >
            {ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
            {c.actShort} s.{c.section}
            <span className="sr-only"> — {CITATION_TEXT[c.status as CitationStatus] ?? c.status}</span>
            {!ok && <span aria-hidden> · unverified</span>}
          </li>
        );
      })}
    </ul>
  );
}

interface Props {
  turns: Turn[];
  advocateName: string;
  /** Follow new turns as they arrive (during a live call). */
  follow?: boolean;
}

export default function TranscriptPane({ turns, advocateName, follow = false }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (follow) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, follow]);

  if (turns.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-cream-100/50 p-4">
        The conversation will appear here as you talk. It is transcribed automatically and saved to your account.
      </p>
    );
  }

  return (
    <div className="space-y-3 p-4" role="log" aria-live="polite" aria-label="Conversation transcript">
      {turns.map((t) => {
        if (t.kind === "SEARCH") {
          return (
            <p
              key={t.id}
              className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-cream-100/50 italic"
            >
              <Search size={12} className="shrink-0" />
              {t.text}
              {Array.isArray(t.citations) && t.citations.length > 0 ? ` — ${t.citations.length} passages found` : " — nothing relevant found"}
            </p>
          );
        }
        if (t.kind === "NOTICE") {
          return (
            <p
              key={t.id}
              className="rounded-lg bg-risk-med-bg dark:bg-risk-med-bg-dark text-risk-med-fg dark:text-risk-med-fg-dark text-[12.5px] px-3 py-2"
            >
              {t.text}
            </p>
          );
        }
        const mine = t.speaker === "USER";
        return (
          <div key={t.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                mine
                  ? "bg-gold-500/15 border border-gold-500/30 rounded-br-sm"
                  : "bg-white dark:bg-navy-800 border border-cream-200 dark:border-white/10 rounded-bl-sm"
              }`}
            >
              <p className="text-[11px] font-mono uppercase tracking-wide text-gray-400 dark:text-cream-100/40 mb-0.5">
                {mine ? "You" : advocateName} · {formatAt(t.atMs)}
              </p>
              <p>{t.text}</p>
              {!mine && Array.isArray(t.citations) && <CitationChips citations={t.citations} />}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
