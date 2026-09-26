import { useId, useState } from "react";
import { BadgeCheck, Bot, Headset, Languages, MapPin, UserRound } from "lucide-react";
import type { PublicAdvocate } from "./consultationApi";

interface Props {
  advocate: PublicAdvocate;
  /** Shown instead of the start button when the advocate can't be joined. */
  unavailableLabel?: string;
  onStart?: () => void;
}

interface Section {
  key: string;
  label: string;
  body: React.ReactNode;
}

const CREDENTIAL_LABELS: Record<string, string> = {
  ENROLMENT: "Bar Council enrolment",
  DEGREE: "Degree",
  CERTIFICATION: "Certification",
  BAR_MEMBERSHIP: "Bar membership",
};

const Chips = ({ items, label }: { items: string[]; label: string }) => (
  <ul className="flex flex-wrap gap-1.5" aria-label={label}>
    {items.map((p) => (
      <li key={p} className="rounded-full bg-cream-100 dark:bg-navy-800 text-[12px] px-2.5 py-0.5 text-navy-800 dark:text-cream-100/80">
        {p}
      </li>
    ))}
  </ul>
);

// A compact profile card for either kind of advocate. Only the name, the AI
// label and a one-line summary are always visible; everything else sits behind
// pills and opens only when clicked, one section at a time.
export default function AdvocateCard({ advocate, unavailableLabel, onStart }: Props) {
  const uid = useId();
  const [open, setOpen] = useState<string | null>(null);
  const isAi = advocate.kind === "AI";
  const canStart = !!onStart && advocate.acceptingConsultations && !unavailableLabel;

  const sources = advocate.credentials.filter((c) => c.type === "KNOWLEDGE_SOURCE");
  const lastVerified = advocate.credentials.find((c) => c.type === "LAST_VERIFIED");
  const humanCreds = advocate.credentials.filter((c) => c.type in CREDENTIAL_LABELS);

  const sections: Section[] = [];

  if (advocate.bio) {
    sections.push({ key: "about", label: "About", body: <p className="leading-relaxed">{advocate.bio}</p> });
  }

  const coverage =
    advocate.statesCovered.length > 0
      ? advocate.statesCovered.join(", ")
      : isAi
        ? "Central Indian law (state-specific rules are not loaded yet)"
        : "Coverage not listed";
  sections.push({
    key: "coverage",
    label: "Languages & coverage",
    body: (
      <div className="space-y-3">
        {advocate.languages.length > 0 && (
          <p className="flex items-start gap-2">
            <Languages size={14} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
            <span>{advocate.languages.join(", ")}</span>
          </p>
        )}
        <p className="flex items-start gap-2">
          <MapPin size={14} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
          <span>{coverage}</span>
        </p>
        {advocate.practiceAreas.length > 0 && <Chips items={advocate.practiceAreas} label="Practice areas" />}
      </div>
    ),
  });

  if (isAi && (sources.length > 0 || lastVerified)) {
    sections.push({
      key: "sources",
      label: "What it's grounded in",
      body: (
        <div className="space-y-2">
          {lastVerified && <p className="text-[12px] text-gray-500 dark:text-cream-100/50">{lastVerified.title}</p>}
          <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {sources.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <BadgeCheck size={14} className="mt-0.5 shrink-0 text-risk-low-fg dark:text-risk-low-fg-dark" aria-hidden />
                <span className="min-w-0">
                  {c.title}
                  {c.issuer ? <span className="text-gray-400 dark:text-cream-100/40"> · {c.issuer}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ),
    });
  }

  if (!isAi && humanCreds.length > 0) {
    sections.push({
      key: "credentials",
      label: "Credentials",
      body: (
        <ul className="space-y-1.5">
          {humanCreds.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <BadgeCheck
                size={14}
                className={`mt-0.5 shrink-0 ${c.verified ? "text-risk-low-fg dark:text-risk-low-fg-dark" : "text-gray-300 dark:text-white/20"}`}
                aria-label={c.verified ? "Verified" : "Not verified"}
              />
              <span className="min-w-0">
                <span className="text-gray-400 dark:text-cream-100/40">{CREDENTIAL_LABELS[c.type]}: </span>
                {c.title}
                {c.issuer ? <span className="text-gray-400 dark:text-cream-100/40"> · {c.issuer}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (isAi) {
    sections.push({
      key: "limits",
      label: "Good to know",
      body: (
        <p className="leading-relaxed">
          An AI, not a human lawyer. It explains the law and your options but cannot appear in court. Only central Indian
          laws are loaded — state rules and court judgments are not — so confirm important steps with an enrolled advocate
          before you act.
        </p>
      ),
    });
  }

  const active = sections.find((s) => s.key === open);

  return (
    <article className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-5 flex flex-col gap-3.5">
      <p className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40">
        {isAi ? "AI advocate" : "Human advocate"}
      </p>

      <header className="flex items-start gap-3.5">
        <span className="w-12 h-12 shrink-0 rounded-full border-2 border-gold-500 bg-navy-950 text-gold-400 flex items-center justify-center overflow-hidden">
          {advocate.photoUrl ? (
            <img src={advocate.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : isAi ? (
            <Bot size={22} />
          ) : (
            <UserRound size={22} />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[17px] font-medium leading-tight">{advocate.displayName}</h3>
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
          {advocate.headline && <p className="text-[13px] text-gray-600 dark:text-cream-100/60 mt-0.5">{advocate.headline}</p>}
          {isAi && <p className="text-[12px] text-gray-500 dark:text-cream-100/50 mt-0.5">An AI — not a human lawyer.</p>}
          {!isAi && advocate.availability && (
            <p
              data-testid="availability"
              data-availability={advocate.availability}
              className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600 dark:text-cream-100/70"
            >
              <span
                aria-hidden
                className={`w-2 h-2 rounded-full ${
                  advocate.availability === "AVAILABLE" ? "bg-risk-low-fg" : advocate.availability === "BUSY" ? "bg-risk-med-fg" : "bg-gray-300 dark:bg-white/25"
                }`}
              />
              {advocate.availability === "AVAILABLE" ? "Available now" : advocate.availability === "BUSY" ? "In a consultation" : "Offline"}
            </p>
          )}
        </div>
      </header>

      <div role="group" aria-label={`More about ${advocate.displayName}`} className="flex flex-wrap gap-1.5">
        {sections.map((s) => {
          const selected = s.key === open;
          return (
            <button
              key={s.key}
              type="button"
              aria-expanded={selected}
              aria-controls={`${uid}-${s.key}`}
              onClick={() => setOpen(selected ? null : s.key)}
              className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-500 ${
                selected
                  ? "bg-gold-500 border-gold-500 text-navy-950"
                  : "bg-cream-100 dark:bg-navy-800 border-cream-200 dark:border-white/10 text-navy-800 dark:text-cream-100/80 hover:border-gold-500/60"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {active && (
        <div
          id={`${uid}-${active.key}`}
          role="region"
          aria-label={active.label}
          className="rounded-lg bg-cream-50 dark:bg-navy-950/60 border border-cream-200 dark:border-white/10 p-3.5 text-[13px] text-gray-700 dark:text-cream-100/75"
        >
          {active.body}
        </div>
      )}

      <div className="mt-auto pt-1">
        {canStart ? (
          <button
            onClick={onStart}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Headset size={16} /> {isAi ? "Start consultation" : "Request consultation"}
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
