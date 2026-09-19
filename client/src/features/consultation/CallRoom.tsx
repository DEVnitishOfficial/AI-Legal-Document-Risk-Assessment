import { useState } from "react";
import { AlertTriangle, Bot, Loader2, Mic, MicOff, PhoneOff, ShieldAlert, UserRound } from "lucide-react";
import { formatDuration, type Consultation } from "./consultationApi";
import type { useConsultationCall } from "./useConsultationCall";
import TranscriptPane from "./TranscriptPane";
import SourcesPanel from "./SourcesPanel";

type Call = ReturnType<typeof useConsultationCall>;

interface Props {
  consultation: Consultation;
  call: Call;
}

// The speaking ring grows with the real audio level, so you can see who has the floor.
function Tile({
  label,
  level,
  active,
  children,
  hint,
}: {
  label: string;
  level: number;
  active: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-navy-900 border border-white/10 p-5 flex flex-col items-center justify-center gap-3 min-h-[180px]">
      <span
        className="w-24 h-24 rounded-full bg-navy-800 border-2 border-gold-500 text-gold-400 flex items-center justify-center transition-shadow duration-100 motion-reduce:transition-none"
        style={{
          boxShadow: active ? `0 0 0 ${3 + Math.round(level * 12)}px rgba(212,175,97,${0.18 + level * 0.45})` : "none",
        }}
      >
        {children}
      </span>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[12px] text-cream-100/50 h-4" aria-live="polite">
          {active ? "Speaking…" : (hint ?? "")}
        </p>
      </div>
    </div>
  );
}

export default function CallRoom({ consultation, call }: Props) {
  const [tab, setTab] = useState<"transcript" | "sources">("transcript");
  const { phase, error, muted, turns, micLevel, advocateLevel, elapsedSec, limitSec } = call;

  const remaining = limitSec !== null ? Math.max(0, limitSec - elapsedSec) : null;
  const lowTime = remaining !== null && remaining <= 60;
  const connecting = phase === "requesting-mic" || phase === "connecting";
  const advocateSpeaking = advocateLevel > 0.12;
  const youSpeaking = !muted && micLevel > 0.12;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-4 p-4 sm:p-6 min-h-0">
      <section aria-label="Call" className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                phase === "live"
                  ? "bg-risk-low-bg dark:bg-risk-low-bg-dark text-risk-low-fg dark:text-risk-low-fg-dark"
                  : "bg-cream-100 dark:bg-navy-800 text-gray-600 dark:text-cream-100/70"
              }`}
            >
              {connecting || phase === "ending" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-current" />
              )}
              {phase === "live" ? "Live" : phase === "ending" ? "Ending…" : "Connecting…"}
            </span>
            <span className="text-[13px] text-gray-500 dark:text-cream-100/50">{consultation.stateName}</span>
          </div>
          {remaining !== null && (
            <p
              className={`font-mono text-sm tabular-nums ${lowTime ? "text-risk-high-fg dark:text-risk-high-fg-dark font-semibold" : "text-gray-500 dark:text-cream-100/60"}`}
              aria-label={`${formatDuration(remaining)} remaining`}
            >
              {formatDuration(remaining)} left
            </p>
          )}
        </div>

        <p className="flex gap-2 items-start rounded-lg bg-cream-100 dark:bg-navy-800 p-3 text-[12.5px] leading-relaxed text-navy-800 dark:text-cream-100/80">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" />
          You are speaking with an AI, not a human lawyer. This call is transcribed and saved to your account. If you are in
          danger, call 112.
        </p>

        {error && (
          <p role="alert" className="flex gap-2 items-start rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-3 text-sm">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Tile
            label={consultation.advocate.name}
            level={advocateLevel}
            active={phase === "live" && advocateSpeaking}
            hint={connecting ? "Joining…" : "Listening"}
          >
            <Bot size={40} />
          </Tile>
          <Tile
            label="You"
            level={micLevel}
            active={phase === "live" && youSpeaking}
            hint={muted ? "Microphone muted" : "Microphone on"}
          >
            {muted ? <MicOff size={38} /> : <UserRound size={40} />}
          </Tile>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={call.toggleMute}
            disabled={phase !== "live"}
            aria-pressed={muted}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium border transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 ${
              muted
                ? "bg-risk-med-bg dark:bg-risk-med-bg-dark text-risk-med-fg dark:text-risk-med-fg-dark border-transparent"
                : "border-cream-200 dark:border-white/15 hover:bg-cream-100 dark:hover:bg-navy-800"
            }`}
          >
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={call.hangup}
            disabled={phase !== "live" && phase !== "connecting"}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-maroon-700 hover:bg-maroon-800 text-white transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-700"
          >
            <PhoneOff size={16} /> End call
          </button>
        </div>
      </section>

      <aside
        aria-label="Transcript and sources"
        className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 flex flex-col min-h-[320px] lg:h-[calc(100vh-9rem)] overflow-hidden"
      >
        <div role="tablist" className="flex border-b border-cream-200 dark:border-white/10 shrink-0">
          {(["transcript", "sources"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[13px] font-medium capitalize border-b-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 ${
                tab === t
                  ? "border-gold-500 text-navy-950 dark:text-white"
                  : "border-transparent text-gray-500 dark:text-cream-100/50 hover:text-navy-950 dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === "transcript" ? (
            <TranscriptPane turns={turns} advocateName={consultation.advocate.name} follow />
          ) : (
            <SourcesPanel turns={turns} />
          )}
        </div>
      </aside>
    </div>
  );
}
