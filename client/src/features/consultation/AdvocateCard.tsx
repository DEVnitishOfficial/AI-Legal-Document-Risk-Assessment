import { useState } from "react";
import { BadgeCheck, Bot, ChevronDown, Headset, Info, Languages, MapPin, UserRound } from "lucide-react";
import type { PublicAdvocate } from "./consultationApi";

const CREDENTIAL_LABELS: Record<string, string> = {
  ENROLMENT: "Bar Council enrolment",
  DEGREE: "Degree",
  CERTIFICATION: "Certification",
  BAR_MEMBERSHIP: "Bar membership",
  KNOWLEDGE_SOURCE: "Knowledge source",
  SCOPE: "Scope",
  LAST_VERIFIED: "Last verified",
};

interface Props {
  advocate: PublicAdvocate;
  /** Shown instead of the start button when the advocate can't be joined. */
  unavailableLabel?: string;
  onStart?: () => void;
}

// One profile card for both kinds of advocate, so switching human advocates on
// later needs no new design. The AI card says plainly that it is an AI and lists
// what it is actually grounded in (its knowledge-source credentials).
export default function AdvocateCard({ advocate, unavailableLabel, onStart }: Props) {
  const [showAll, setShowAll] = useState(false);
  const isAi = advocate.kind === "AI";
  const creds = advocate.credentials;
  const visible = showAll ? creds : creds.slice(0, 5);
  const canStart = !!onStart && advocate.acceptingConsultations && !unavailableLabel;

  return (
    <article
      className={`rounded-xl border bg-white dark:bg-navy-900 p-5 flex flex-col gap-4 ${
        canStart ? "border-cream-200 dark:border-white/10" : "border-cream-200 dark:border-white/10 opacity-80"
      }`}
    >
      <header className="flex items-start gap-4">
        <span className="w-14 h-14 shrink-0 rounded-full border-2 border-gold-500 bg-navy-950 text-gold-400 flex items-center justify-center overflow-hidden">
          {advocate.photoUrl ? (
            <img src={advocate.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : isAi ? (
            <Bot size={26} />
          ) : (
            <UserRound size={26} />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-medium leading-tight">{advocate.displayName}</h3>
            {isAi ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/40 px-2 py-0.5 text-[11px] font-semibold tracking-wide">
                <Bot size={12} /> AI
              </span>
            ) : (
              advocate.verificationStatus === "VERIFIED" && (
                <span
                  aria-label="Verified"
                  className="inline-flex items-center gap-1 rounded-full bg-risk-low-bg dark:bg-risk-low-bg-dark text-risk-low-fg dark:text-risk-low-fg-dark px-2 py-0.5 text-[11px] font-semibold"
                >
                  <BadgeCheck size={12} /> Verified
                </span>
              )
            )}
          </div>
          {advocate.headline && (
            <p className="text-sm text-gray-600 dark:text-cream-100/60 mt-0.5">{advocate.headline}</p>
          )}
        </div>
      </header>

      {advocate.bio && (
        <p className="text-sm text-gray-600 dark:text-cream-100/70 leading-relaxed">{advocate.bio}</p>
      )}

      <dl className="grid gap-2 text-[13px]">
        {advocate.languages.length > 0 && (
          <div className="flex items-start gap-2">
            <Languages size={14} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
            <dt className="sr-only">Languages</dt>
            <dd>{advocate.languages.join(", ")}</dd>
          </div>
        )}
        <div className="flex items-start gap-2">
          <MapPin size={14} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
          <dt className="sr-only">Coverage</dt>
          <dd>
            {advocate.statesCovered.length > 0
              ? advocate.statesCovered.join(", ")
              : isAi
                ? "Central Indian law (state-specific rules are not loaded yet)"
                : "Coverage not listed"}
          </dd>
        </div>
      </dl>

      {advocate.practiceAreas.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Practice areas">
          {advocate.practiceAreas.map((p) => (
            <li
              key={p}
              className="rounded-full bg-cream-100 dark:bg-navy-800 text-[12px] px-2.5 py-0.5 text-navy-800 dark:text-cream-100/80"
            >
              {p}
            </li>
          ))}
        </ul>
      )}

      {creds.length > 0 && (
        <div>
          <h4 className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-2">
            {isAi ? "What it is grounded in" : "Credentials"}
          </h4>
          <ul className="space-y-1.5">
            {visible.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[13px]">
                <BadgeCheck
                  size={14}
                  className={`mt-0.5 shrink-0 ${c.verified ? "text-risk-low-fg dark:text-risk-low-fg-dark" : "text-gray-300 dark:text-white/20"}`}
                  aria-label={c.verified ? "Verified" : "Not verified"}
                />
                <span className="min-w-0">
                  <span className="text-gray-400 dark:text-cream-100/40">{CREDENTIAL_LABELS[c.type] ?? c.type}: </span>
                  {c.title}
                  {c.issuer ? <span className="text-gray-400 dark:text-cream-100/40"> · {c.issuer}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {creds.length > 5 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold-600 dark:text-gold-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
            >
              {showAll ? "Show fewer" : `Show all ${creds.length}`}
              <ChevronDown size={13} className={showAll ? "rotate-180" : ""} />
            </button>
          )}
        </div>
      )}

      {isAi && (
        <p className="flex gap-2 rounded-lg bg-cream-100 dark:bg-navy-800 p-3 text-[12.5px] leading-relaxed text-navy-800 dark:text-cream-100/80">
          <Info size={15} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
          <span>
            An AI, not a human lawyer. It explains the law and your options but cannot appear in court, and its answers
            should be confirmed with an enrolled advocate before you act.
          </span>
        </p>
      )}

      <div className="mt-auto pt-1">
        {canStart ? (
          <button
            onClick={onStart}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Headset size={16} /> Start consultation
          </button>
        ) : (
          <button
            disabled
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-cream-200 dark:border-white/10 text-gray-400 dark:text-cream-100/40 font-medium text-sm py-2.5 cursor-not-allowed"
          >
            {unavailableLabel ?? "Not available right now"}
          </button>
        )}
      </div>
    </article>
  );
}
