import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Clock, Headset, Loader2 } from "lucide-react";
import PageShell from "../features/consultation/PageShell";
import HumanCallRoom from "../features/human/HumanCallRoom";
import NotesPanel from "../features/human/NotesPanel";
import { useHub } from "../features/human/useHub";
import { useWebRtcCall } from "../features/human/useWebRtcCall";
import { apiErrorMessage, humanApi, type DeskConsultation } from "../features/human/humanApi";
import { END_REASON_LABELS, formatDuration } from "../features/consultation/consultationApi";

const IN_CALL = ["starting", "waiting-peer", "connecting", "live"];

// The advocate's side of one consultation: the call with the client's details and notes
// beside it while it is on, and just the notes afterwards.
export default function AdvocateSessionPage() {
  const id = Number(useParams().id);
  const location = useLocation();
  const navigate = useNavigate();
  const hub = useHub();
  const yourName = useSelector((s: any) => s.auth.user?.name) || "You";

  const [c, setC] = useState<DeskConsultation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const autostart = useRef(!!location.state?.autostart);
  const started = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setC(await humanApi.deskConsultation(id));
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Could not load this consultation."));
    }
  }, [id]);

  // Advocates normally want to be seen; the camera button turns it off (or the browser may refuse).
  // When the call ends, fetch the record again so the page shows what was actually saved (notes included).
  const call = useWebRtcCall({ consultationId: id, role: "advocate", hub, initialCamera: true, onEnded: () => void refresh() });

  useEffect(() => void refresh(), [refresh]);

  // Stay reachable (and correctly "busy") while in a session: this page keeps the desk open too.
  useEffect(() => {
    if (!hub) return;
    hub.send({ type: "desk.open" });
    hub.onReady = () => hub.send({ type: "desk.open" });
    const off = hub.on("request.update", (m) => m.consultationId === id && void refresh());
    return () => {
      off();
      hub.onReady = null;
    };
  }, [hub, id, refresh]);

  useEffect(() => {
    if (autostart.current && !started.current && hub && c && (c.status === "ACCEPTED" || c.status === "LIVE") && call.phase === "idle") {
      started.current = true;
      void call.start();
    }
  }, [hub, c, call]);

  const back = (
    <Link
      to="/advocate"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-cream-100/50 hover:text-navy-950 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
    >
      <ArrowLeft size={15} /> Advocate desk
    </Link>
  );

  if (loadError) {
    return (
      <PageShell>
        <div className="p-6 space-y-4">
          {back}
          <p role="alert" className="max-w-2xl rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-4 text-sm">
            {loadError}
          </p>
        </div>
      </PageShell>
    );
  }
  if (!c) {
    return (
      <PageShell>
        <p className="p-6 flex items-center gap-2 text-sm text-gray-500" role="status">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </p>
      </PageShell>
    );
  }

  if (IN_CALL.includes(call.phase)) {
    return (
      <PageShell>
        <HumanCallRoom call={call} otherName={c.clientName} otherRole="client" yourName={yourName} side={<NotesPanel consultation={c} />} />
      </PageShell>
    );
  }

  const live = c.status === "ACCEPTED" || c.status === "LIVE";
  const date = new Date(c.startedAt ?? c.requestedAt ?? Date.now()).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <PageShell>
      <div className="p-6 space-y-5">
        {back}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <div className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-6 space-y-4">
            <div>
              <h1 className="font-display text-xl font-medium">
                {live ? `Consultation with ${c.clientName}` : `${c.clientName} — ${c.status === "ENDED" ? "completed" : c.status.toLowerCase()}`}
              </h1>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500 dark:text-cream-100/50 mt-1">
                <span>{date}</span>
                <span>{c.stateName}</span>
                {c.status === "ENDED" && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} /> {formatDuration(c.durationSec)}
                  </span>
                )}
                {c.endReason && <span>{END_REASON_LABELS[c.endReason] ?? c.endReason}</span>}
              </p>
            </div>

            {call.error && (
              <p role="alert" className="rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-3 text-sm">
                {call.error}
              </p>
            )}

            {live ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-cream-100/60">
                  {c.status === "LIVE" ? "This call is still open." : "The client has been told you accepted."} Join the call when you're ready.
                </p>
                <button
                  onClick={() => void call.start()}
                  className="inline-flex items-center gap-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm px-5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  <Headset size={16} /> {call.error ? "Try again" : "Join the call"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-cream-100/60">
                {c.status === "ENDED"
                  ? "The call was not recorded. Your notes are below — the client sees only the notes you chose to share."
                  : "This consultation did not go ahead."}
              </p>
            )}

            <button onClick={() => navigate("/advocate")} className="text-sm font-medium text-gold-600 dark:text-gold-400 hover:underline">
              Back to your desk
            </button>
          </div>

          {(live || c.status === "ENDED") && <NotesPanel consultation={c} />}
        </div>
      </div>
    </PageShell>
  );
}
