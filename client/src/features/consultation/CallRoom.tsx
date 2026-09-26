import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  Captions,
  CaptionsOff,
  Loader2,
  Mic,
  MicOff,
  PanelRightClose,
  PanelRightOpen,
  PhoneOff,
  ShieldAlert,
  Video,
  VideoOff,
} from "lucide-react";
import { formatDuration, type Consultation } from "./consultationApi";
import type { useConsultationCall } from "./useConsultationCall";
import type { useLocalCamera } from "./useLocalCamera";
import AdvocateOrb, { type OrbState } from "./AdvocateOrb";
import SelfView from "./SelfView";
import ControlButton from "./ControlButton";
import TranscriptPane from "./TranscriptPane";
import SourcesPanel from "./SourcesPanel";

type Call = ReturnType<typeof useConsultationCall>;
type Camera = ReturnType<typeof useLocalCamera>;

interface Props {
  consultation: Consultation;
  call: Call;
  camera: Camera;
  userName: string;
}

// A video-call layout: the advocate is centred on the stage, your own picture sits in the
// corner (camera optional, and local only), captions follow what is said, and the
// transcript / sources live in a side panel that can be hidden.
export default function CallRoom({ consultation, call, camera, userName }: Props) {
  const [tab, setTab] = useState<"transcript" | "sources">("transcript");
  const [panelOpen, setPanelOpen] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const { phase, error, muted, turns, micLevel, advocateLevel, elapsedSec, limitSec } = call;

  const remaining = limitSec !== null ? Math.max(0, limitSec - elapsedSec) : null;
  const lowTime = remaining !== null && remaining <= 60;
  const connecting = phase === "requesting-mic" || phase === "connecting";
  const advocateSpeaking = phase === "live" && advocateLevel > 0.1;
  const youSpeaking = phase === "live" && !muted && micLevel > 0.12;

  // "Thinking" = the client just spoke, or the advocate is mid-lookup, and it has not answered yet.
  const lastTurn = [...turns].reverse().find((t) => t.kind !== "NOTICE");
  const recent = lastTurn ? elapsedSec * 1000 - lastTurn.atMs < 9000 : false;
  const searching = lastTurn?.kind === "SEARCH";
  const thinking =
    phase === "live" && !advocateSpeaking && recent && (searching || (lastTurn?.kind === "SPEECH" && lastTurn.speaker === "USER"));

  const orbState: OrbState = connecting ? "connecting" : advocateSpeaking ? "speaking" : thinking ? "thinking" : "listening";
  const statusText = connecting
    ? "Joining…"
    : advocateSpeaking
      ? "Speaking"
      : thinking
        ? searching
          ? "Checking the law…"
          : "Thinking…"
        : "Listening";

  return (
    <div className={`grid gap-4 p-4 sm:p-6 min-h-0 ${panelOpen ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
      <section aria-label="Call" className="space-y-3 min-w-0">
        <p className="flex gap-2 items-center rounded-lg bg-cream-100 dark:bg-navy-800 px-3 py-2 text-[12.5px] leading-relaxed text-navy-800 dark:text-cream-100/80">
          <ShieldAlert size={14} className="shrink-0 text-gold-600 dark:text-gold-400" />
          You are speaking with an AI, not a human lawyer. The call is transcribed and saved to your account. If you are in
          danger, call 112.
        </p>

        {error && (
          <p role="alert" className="flex gap-2 items-start rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-3 text-sm">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl h-[68vh] min-h-[420px] lg:h-[calc(100vh-11rem)] lg:max-h-[780px]"
          style={{ background: "radial-gradient(ellipse at 50% 32%, #34456f 0%, #182140 46%, #0a0f1e 100%)" }}
        >
          <AdvocateOrb level={advocateLevel} state={orbState} className="absolute inset-0" />

          {/* top-left: status and who this is */}
          <div className="absolute top-3 left-3 space-y-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                phase === "live" ? "bg-risk-low-bg text-risk-low-fg" : "bg-white/15 text-white"
              }`}
            >
              {connecting || phase === "ending" ? <Loader2 size={12} className="animate-spin" /> : <span className="w-2 h-2 rounded-full bg-current" />}
              {phase === "live" ? "Live" : phase === "ending" ? "Ending…" : "Connecting…"}
            </span>
            <div className="rounded-lg bg-black/45 backdrop-blur-sm px-3 py-2">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-white">
                {consultation.advocate.name}
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/25 text-gold-400 border border-gold-500/40 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
                  <Bot size={10} /> AI
                </span>
              </p>
              <p className="text-[12px] text-cream-100/70" aria-live="polite">
                {statusText} · {consultation.stateName}
              </p>
            </div>
          </div>

          {/* top-right: time left */}
          {remaining !== null && (
            <p
              className={`absolute top-3 right-3 rounded-full bg-black/45 backdrop-blur-sm px-3 py-1 font-mono text-sm tabular-nums ${
                lowTime ? "text-[#f0a89e] font-semibold" : "text-cream-100/85"
              }`}
              aria-label={`${formatDuration(remaining)} remaining`}
            >
              {formatDuration(remaining)} left
            </p>
          )}

          {/* your picture-in-picture */}
          <SelfView
            stream={camera.stream}
            name={userName}
            muted={muted}
            speaking={youSpeaking}
            level={micLevel}
            className="absolute right-3 top-14 w-28 h-36 sm:w-36 sm:h-44"
          />

          {/* live captions */}
          {captionsOn && call.caption && (
            <p
              className="absolute left-1/2 -translate-x-1/2 bottom-24 w-[min(92%,640px)] rounded-lg bg-black/65 px-4 py-2 text-center text-[13px] sm:text-[15px] leading-snug text-white"
              aria-live="off"
            >
              {/* Only the latest words, so captions never bury the face. */}
              {call.caption.length > 120 ? `…${call.caption.slice(-120).replace(/^\S*\s/, "")}` : call.caption}
            </p>
          )}

          {/* controls */}
          <div
            role="toolbar"
            aria-label="Call controls"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-navy-950/80 backdrop-blur border border-white/10 p-2"
          >
            <ControlButton label={muted ? "Unmute" : "Mute"} onClick={call.toggleMute} pressed={muted} disabled={phase !== "live"}>
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </ControlButton>
            <ControlButton
              label={camera.on ? "Turn camera off" : "Turn camera on"}
              onClick={camera.toggle}
              pressed={camera.on}
              disabled={camera.busy}
            >
              {camera.on ? <Video size={18} /> : <VideoOff size={18} />}
            </ControlButton>
            <ControlButton label={captionsOn ? "Hide captions" : "Show captions"} onClick={() => setCaptionsOn((v) => !v)} pressed={captionsOn}>
              {captionsOn ? <Captions size={18} /> : <CaptionsOff size={18} />}
            </ControlButton>
            <ControlButton label={panelOpen ? "Hide transcript panel" : "Show transcript panel"} onClick={() => setPanelOpen((v) => !v)}>
              {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </ControlButton>
            <button
              onClick={call.hangup}
              disabled={phase !== "live" && phase !== "connecting"}
              aria-label="End call"
              className="ml-1 inline-flex items-center gap-2 whitespace-nowrap rounded-full h-11 px-4 sm:px-5 text-sm font-semibold bg-maroon-700 hover:bg-maroon-800 text-white transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-700"
            >
              <PhoneOff size={16} /> End call
            </button>
          </div>
        </div>

        {camera.error && (
          <p role="status" className="text-[12.5px] text-risk-med-fg dark:text-risk-med-fg-dark">
            {camera.error}
          </p>
        )}
        <p className="text-[12px] text-gray-500 dark:text-cream-100/45">
          Your camera, if on, is shown only to you. The advocate is an AI that doesn't use video, so nothing from your camera is sent
          or recorded.
        </p>
      </section>

      {panelOpen && (
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
      )}
    </div>
  );
}
