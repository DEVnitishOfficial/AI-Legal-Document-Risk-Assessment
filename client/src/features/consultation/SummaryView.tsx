import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lightbulb,
  ListChecks,
  Loader2,
  Printer,
  Scale,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { END_REASON_LABELS, formatDuration, type Consultation, type Turn } from "./consultationApi";
import TranscriptPane from "./TranscriptPane";
import SourcesPanel from "./SourcesPanel";

interface Props {
  consultation: Consultation;
  /** Loaded lazily when the user opens the transcript. */
  loadTurns: () => Promise<Turn[]>;
  onDelete: () => Promise<void>;
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-5 break-inside-avoid">
      <h3 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-3">
        <Icon size={14} className="text-gold-600 dark:text-gold-400" /> {title}
      </h3>
      {children}
    </section>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-[14px] leading-relaxed">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
);

export default function SummaryView({ consultation: c, loadTurns, onDelete }: Props) {
  const [turns, setTurns] = useState<Turn[] | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loadingTurns, setLoadingTurns] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const s = c.summary ?? null;
  const date = new Date(c.startedAt ?? c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const toggleTranscript = async () => {
    const next = !showTranscript;
    setShowTranscript(next);
    if (next && !turns) {
      setLoadingTurns(true);
      try {
        setTurns(await loadTurns());
      } finally {
        setLoadingTurns(false);
      }
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-medium">Consultation with {c.advocate.name}</h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500 dark:text-cream-100/50 mt-1">
            <span>{date}</span>
            <span>{c.stateName}</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {formatDuration(c.durationSec)}
            </span>
            {c.endReason && <span>{END_REASON_LABELS[c.endReason] ?? c.endReason}</span>}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          {c.summaryStatus === "READY" && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cream-200 dark:border-white/15 px-3 py-2 text-[13px] font-medium hover:bg-cream-100 dark:hover:bg-navy-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
            >
              <Printer size={14} /> Print / save PDF
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cream-200 dark:border-white/15 px-3 py-2 text-[13px] font-medium text-risk-high-fg dark:text-risk-high-fg-dark hover:bg-risk-high-bg dark:hover:bg-risk-high-bg-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {c.summaryStatus === "PENDING" && (
        <p className="flex items-center gap-2 rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-5 text-sm" role="status">
          <Loader2 size={16} className="animate-spin text-gold-600" /> Writing your case summary… this usually takes a few seconds.
        </p>
      )}
      {c.summaryStatus === "FAILED" && (
        <p role="alert" className="rounded-xl bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-4 text-sm">
          The summary couldn't be written this time. Your transcript below is saved.
        </p>
      )}
      {(c.summaryStatus === "SKIPPED" || c.summaryStatus === "NONE") && (
        <p className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-4 text-sm text-gray-600 dark:text-cream-100/70">
          There isn't enough conversation to summarise — the call ended before much was said.
        </p>
      )}

      {s && (
        <>
          {s.unverifiedMentions.length > 0 && (
            <p role="alert" className="flex gap-2 rounded-xl bg-risk-med-bg dark:bg-risk-med-bg-dark text-risk-med-fg dark:text-risk-med-fg-dark p-4 text-[13.5px] leading-relaxed">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                These provisions could not be confirmed from the official text, so treat them with caution and check them
                with an advocate: <strong>{s.unverifiedMentions.join(", ")}</strong>.
              </span>
            </p>
          )}

          <Section icon={Scale} title="Your situation">
            <p className="text-[14.5px] leading-relaxed">{s.situation}</p>
            {s.keyFacts.length > 0 && (
              <div className="mt-3">
                <Bullets items={s.keyFacts} />
              </div>
            )}
          </Section>

          {s.provisions.length > 0 && (
            <Section icon={CheckCircle2} title="The law that applies">
              <ul className="space-y-3">
                {s.provisions.map((p, i) => (
                  <li key={i} className="text-[14px] leading-relaxed">
                    <p className="font-semibold">{p.citation}</p>
                    <p className="text-gray-600 dark:text-cream-100/70">{p.plainMeaning}</p>
                  </li>
                ))}
              </ul>
              {s.unverifiedMentions.length === 0 && (
                <p className="text-[12px] text-risk-low-fg dark:text-risk-low-fg-dark mt-3 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Every provision here was checked against the official text.
                </p>
              )}
            </Section>
          )}

          {s.options.length > 0 && (
            <Section icon={ListChecks} title="Your options">
              <div className="space-y-4">
                {s.options.map((o, i) => (
                  <div key={i} className="rounded-lg border border-cream-200 dark:border-white/10 p-4">
                    <p className="font-semibold text-[14.5px]">
                      {i + 1}. {o.title}
                    </p>
                    {o.steps.length > 0 && (
                      <ol className="list-decimal pl-5 mt-2 space-y-1 text-[13.5px] leading-relaxed">
                        {o.steps.map((st, j) => (
                          <li key={j}>{st}</li>
                        ))}
                      </ol>
                    )}
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-[13px]">
                      {[
                        ["Where", o.forum],
                        ["How long", o.timeline],
                        ["Likely reaction", o.likelyReaction],
                        ["Risks", o.risks],
                      ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-gray-400 dark:text-cream-100/40 font-mono text-[10.5px] uppercase tracking-wide">{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {s.recommendation?.text && (
            <Section icon={Lightbulb} title="What the advocate suggested">
              <p className="text-[14.5px] leading-relaxed">{s.recommendation.text}</p>
              {s.recommendation.rationale && (
                <p className="text-[13.5px] text-gray-600 dark:text-cream-100/70 mt-2">{s.recommendation.rationale}</p>
              )}
              <p className="text-[12.5px] font-medium text-gold-600 dark:text-gold-400 mt-3">The decision is yours.</p>
            </Section>
          )}

          {(s.nextSteps.length > 0 || s.deadlines.length > 0) && (
            <div className={`grid gap-4 ${s.nextSteps.length > 0 && s.deadlines.length > 0 ? "sm:grid-cols-2" : ""}`}>
              {s.nextSteps.length > 0 && (
                <Section icon={ListChecks} title="Next steps">
                  <Bullets items={s.nextSteps} />
                </Section>
              )}
              {s.deadlines.length > 0 && (
                <Section icon={CalendarClock} title="Deadlines to watch">
                  <Bullets items={s.deadlines} />
                </Section>
              )}
            </div>
          )}

          {s.openQuestions.length > 0 && (
            <Section icon={ShieldAlert} title="Still to confirm with an advocate">
              <Bullets items={s.openQuestions} />
            </Section>
          )}

          <p className="text-[12.5px] leading-relaxed text-gray-500 dark:text-cream-100/50 rounded-lg bg-cream-100 dark:bg-navy-800 p-4">
            {s.disclaimer}
          </p>
        </>
      )}

      <div className="print:hidden">
        <button
          onClick={toggleTranscript}
          aria-expanded={showTranscript}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 dark:text-gold-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
        >
          {showTranscript ? "Hide" : "Show"} the full transcript and sources
          <ChevronDown size={15} className={showTranscript ? "rotate-180" : ""} />
        </button>
        {showTranscript && (
          <div className="mt-3 rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 overflow-hidden">
            {loadingTurns || !turns ? (
              <p className="p-4 text-sm flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" /> Loading…
              </p>
            ) : (
              <>
                <TranscriptPane turns={turns} advocateName={c.advocate.name} />
                <div className="border-t border-cream-200 dark:border-white/10">
                  <h3 className="px-4 pt-3 font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40">
                    Sources looked up
                  </h3>
                  <SourcesPanel turns={turns} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this consultation?"
          message="The transcript and summary will be permanently removed from your account."
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
