import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Mic, MicOff, PhoneOff, ShieldCheck, UserRound, Video, VideoOff, Volume2 } from "lucide-react";
import { formatDuration } from "../consultation/consultationApi";
import ControlButton from "../consultation/ControlButton";
import SelfView from "../consultation/SelfView";
import type { useWebRtcCall } from "./useWebRtcCall";

type Call = ReturnType<typeof useWebRtcCall>;

interface Props {
  call: Call;
  /** Who is on the other end, for the name tag and the placeholder. */
  otherName: string;
  otherPhotoUrl?: string | null;
  otherRole: "advocate" | "client";
  yourName: string;
  /** Extra content beside the stage (the advocate's notes, or the client's issue). */
  side?: React.ReactNode;
}

// The other person's video fills the stage; with their camera off, their photo or initial
// stands in while the sound keeps playing. Yours sits in the corner. Nothing here is
// recorded — the two browsers are connected directly.
export default function HumanCallRoom({ call, otherName, otherPhotoUrl, otherRole, yourName, side }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const { phase, muted, cameraOn, micLevel, remoteStream, remoteHasVideo, peerPresent, elapsedSec, limitSec } = call;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.srcObject = remoteStream;
    if (remoteStream) v.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
  }, [remoteStream]);

  const live = phase === "live";
  const remaining = live && limitSec !== null ? Math.max(0, limitSec - elapsedSec) : null;
  const lowTime = remaining !== null && remaining <= 60;
  const status =
    phase === "starting"
      ? "Starting…"
      : !peerPresent
        ? `Waiting for ${otherName} to join…`
        : live
          ? "Live"
          : "Connecting…";
  const initial = otherName.replace(/^(Dr\.?|Adv\.?|Advocate)\s+/i, "").charAt(0).toUpperCase() || "?";

  return (
    <div className={`grid gap-4 p-4 sm:p-6 min-h-0 ${side ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
      <section aria-label="Call" className="space-y-3 min-w-0">
        <p className="flex gap-2 items-center rounded-lg bg-cream-100 dark:bg-navy-800 px-3 py-2 text-[12.5px] leading-relaxed text-navy-800 dark:text-cream-100/80">
          <ShieldCheck size={14} className="shrink-0 text-gold-600 dark:text-gold-400" />
          {otherRole === "advocate"
            ? `A private call with ${otherName}. The call is connected directly between your devices and is not recorded by NyayMitra. If you are in danger, call 112.`
            : `A private call with your client. The call is connected directly between your devices and is not recorded.`}
        </p>

        {call.error && (
          <p role="alert" className="flex gap-2 items-start rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-3 text-sm">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {call.error}
          </p>
        )}
        {call.warning !== null && (
          <p role="status" className="rounded-lg bg-risk-med-bg dark:bg-risk-med-bg-dark text-risk-med-fg dark:text-risk-med-fg-dark px-3 py-2 text-sm">
            This call reaches its time limit in about a minute.
          </p>
        )}

        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl h-[68vh] min-h-[420px] lg:h-[calc(100vh-11rem)] lg:max-h-[780px]"
          style={{ background: "radial-gradient(ellipse at 50% 32%, #34456f 0%, #182140 46%, #0a0f1e 100%)" }}
        >
          {/* The other person. The element stays mounted so their voice plays even without video. */}
          <video
            ref={video}
            autoPlay
            playsInline
            aria-label={`${otherName}'s video`}
            className={`absolute inset-0 h-full w-full object-cover ${remoteHasVideo ? "" : "invisible"}`}
          />
          {!remoteHasVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span
                className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-gold-500 bg-navy-800 text-gold-400 flex items-center justify-center overflow-hidden font-display text-6xl"
                aria-hidden
              >
                {otherPhotoUrl ? <img src={otherPhotoUrl} alt="" className="w-full h-full object-cover" /> : initial || <UserRound size={64} />}
              </span>
              {!peerPresent && (
                <p className="flex items-center gap-2 text-sm text-cream-100/70">
                  <Loader2 size={15} className="animate-spin" /> {status}
                </p>
              )}
            </div>
          )}

          <div className="absolute top-3 left-3 space-y-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                live ? "bg-risk-low-bg text-risk-low-fg" : "bg-white/15 text-white"
              }`}
            >
              {live ? <span className="w-2 h-2 rounded-full bg-current" /> : <Loader2 size={12} className="animate-spin" />}
              {status}
            </span>
            <p className="rounded-lg bg-black/45 backdrop-blur-sm px-3 py-1.5 text-[13px] font-semibold text-white">{otherName}</p>
          </div>

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

          <SelfView
            stream={call.localStream}
            name={yourName}
            muted={muted}
            speaking={live && !muted && micLevel > 0.12}
            level={micLevel}
            className="absolute right-3 top-14 w-28 h-36 sm:w-36 sm:h-44"
          />

          {needsTap && (
            <button
              onClick={() => video.current?.play().then(() => setNeedsTap(false)).catch(() => undefined)}
              className="absolute left-1/2 -translate-x-1/2 bottom-24 inline-flex items-center gap-2 rounded-full bg-gold-500 text-navy-950 px-4 py-2 text-sm font-semibold"
            >
              <Volume2 size={16} /> Tap to hear {otherName}
            </button>
          )}

          <div
            role="toolbar"
            aria-label="Call controls"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-navy-950/80 backdrop-blur border border-white/10 p-2"
          >
            <ControlButton label={muted ? "Unmute" : "Mute"} onClick={call.toggleMute} pressed={muted} disabled={!call.localStream}>
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </ControlButton>
            <ControlButton
              label={cameraOn ? "Turn camera off" : "Turn camera on"}
              onClick={call.toggleCamera}
              pressed={cameraOn}
              disabled={!call.localStream}
            >
              {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
            </ControlButton>
            <button
              onClick={() => void call.hangup()}
              disabled={phase === "idle" || phase === "ended"}
              aria-label="End call"
              className="ml-1 inline-flex items-center gap-2 whitespace-nowrap rounded-full h-11 px-4 sm:px-5 text-sm font-semibold bg-maroon-700 hover:bg-maroon-800 text-white transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-700"
            >
              <PhoneOff size={16} /> End call
            </button>
          </div>
        </div>

        {call.cameraError && (
          <p role="status" className="text-[12.5px] text-risk-med-fg dark:text-risk-med-fg-dark">
            {call.cameraError}
          </p>
        )}
      </section>

      {side && <aside className="min-w-0">{side}</aside>}
    </div>
  );
}
