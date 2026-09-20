import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Clock, Headset, Loader2, Trash2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import PageShell from "../features/consultation/PageShell";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import HumanCallRoom from "../features/human/HumanCallRoom";
import { useHub } from "../features/human/useHub";
import { useWebRtcCall } from "../features/human/useWebRtcCall";
import { useNow } from "../features/human/deskAlerts";
import { humanApi } from "../features/human/humanApi";
import {
  apiErrorMessage,
  consultationApi,
  END_REASON_LABELS,
  formatDuration,
  type Consultation,
  type PublicAdvocate,
} from "../features/consultation/consultationApi";

const IN_CALL = ["starting", "waiting-peer", "connecting", "live"];

// The client's whole journey with a real advocate on one page: waiting for them to
// respond, the call itself, and what is left afterwards. It follows the request in real
// time (and polls as a fallback), so it always shows the current state.
export default function HumanConsultationPage() {
  const id = Number(useParams().id);
  const location = useLocation();
  const navigate = useNavigate();
  const hub = useHub();
  const userName = useSelector((s: any) => s.auth.user?.name) || "You";

  const [c, setC] = useState<Consultation | null>(null);
  const [advocate, setAdvocate] = useState<PublicAdvocate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wantsCamera = useRef(!!location.state?.camera);
  const autostarted = useRef(false);
  const now = useNow();

  const refresh = useCallback(async () => {
    try {
      setC(await consultationApi.get(id));
    } catch (err: any) {
      setLoadError(apiErrorMessage(err, err?.response?.status === 404 ? "Consultation not found." : "Could not load this consultation."));
    }
  }, [id]);

  const call = useWebRtcCall({ consultationId: id, role: "user", hub, initialCamera: wantsCamera.current, onEnded: () => void refresh() });

  useEffect(() => void refresh(), [refresh]);

  // The advocate's photo for the call screen (best effort).
  useEffect(() => {
    if (!c?.advocate.id) return;
    consultationApi
      .advocates()
      .then((list) => setAdvocate(list.find((a) => a.id === c.advocate.id) ?? null))
      .catch(() => undefined);
  }, [c?.advocate.id]);

  // Realtime updates about this request, plus a slow poll in case the connection drops.
  useEffect(() => {
    if (!hub) return;
    const off = hub.on("request.update", (m) => m.consultationId === id && void refresh());
    return off;
  }, [hub, id, refresh]);
  useEffect(() => {
    if (!c || !["REQUESTED", "ACCEPTED"].includes(c.status)) return;
    const t = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(t);
  }, [c, refresh]);

  // Once the advocate has accepted, join the call straight away.
  useEffect(() => {
    if (c?.status === "ACCEPTED" && hub && call.phase === "idle" && !autostarted.current) {
      autostarted.current = true;
      void call.start();
    }
  }, [c?.status, hub, call]);

  const cancel = async () => {
    setCancelling(true);
    try {
      setC(await humanApi.cancel(id));
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't cancel the request"));
    } finally {
      setCancelling(false);
    }
  };

  const remove = async () => {
    await consultationApi.remove(id);
    navigate("/connect-advocate/history", { replace: true });
  };

  const back = (
    <Link
      to="/connect-advocate"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-cream-100/50 hover:text-navy-950 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
    >
      <ArrowLeft size={15} /> Connect Advocate
    </Link>
  );
  const card = "max-w-2xl rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-6 space-y-4";
  const primary =
    "inline-flex items-center gap-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm px-5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

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
  // An AI consultation opened at the human address.
  if (c.advocateKind !== "HUMAN") return <Navigate to={`/connect-advocate/session/${id}`} replace />;

  // ── in the call ─────────────────────────────────────────────────────────────
  if (IN_CALL.includes(call.phase)) {
    return (
      <PageShell>
        <HumanCallRoom
          call={call}
          otherName={c.advocate.name}
          otherPhotoUrl={advocate?.photoUrl}
          otherRole="advocate"
          yourName={userName}
          side={
            c.subject ? (
              <section className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-4">
                <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-2">
                  What you asked about
                </h2>
                <p className="text-[13.5px] leading-relaxed">{c.subject}</p>
                <p className="text-[12px] text-gray-500 dark:text-cream-100/50 mt-3">{c.stateName}</p>
              </section>
            ) : undefined
          }
        />
      </PageShell>
    );
  }

  // ── waiting for the advocate to respond ─────────────────────────────────────
  if (c.status === "REQUESTED") {
    const left = c.expiresAt ? Math.max(0, Math.round((new Date(c.expiresAt).getTime() - now) / 1000)) : null;
    return (
      <PageShell>
        <div className="p-6 space-y-5">
          {back}
          <div className={card} role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full border-2 border-gold-500 text-gold-500 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin" />
              </span>
              <div>
                <h1 className="font-display text-xl font-medium">Waiting for {c.advocate.name}</h1>
                <p className="text-sm text-gray-600 dark:text-cream-100/60">
                  They've been told you're here. Please keep this page open.
                </p>
              </div>
            </div>
            {left !== null && (
              <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-cream-100/50">
                <Clock size={14} /> The request stays open for {formatDuration(left)} more.
              </p>
            )}
            {c.subject && (
              <p className="text-[13.5px] leading-relaxed rounded-lg bg-cream-100 dark:bg-navy-800 p-3">
                <span className="block text-[11px] font-mono uppercase tracking-wide text-gray-400 dark:text-cream-100/40 mb-1">
                  Your message
                </span>
                {c.subject}
              </p>
            )}
            <button
              onClick={cancel}
              disabled={cancelling}
              className="inline-flex items-center gap-2 rounded-lg border border-cream-200 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-cream-100 dark:hover:bg-navy-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
            >
              {cancelling && <Loader2 size={14} className="animate-spin" />} Cancel request
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── accepted, or live in a call this browser is not part of (e.g. after a refresh) ──
  if (c.status === "ACCEPTED" || c.status === "LIVE") {
    return (
      <PageShell>
        <div className="p-6 space-y-5">
          {back}
          <div className={card} role="status" aria-live="polite">
            <h1 className="font-display text-xl font-medium">
              {c.status === "ACCEPTED" ? `${c.advocate.name} accepted your request` : "Your call is still open"}
            </h1>
            {call.error ? (
              <p role="alert" className="rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-3 text-sm">
                {call.error}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-cream-100/60">
                <Loader2 size={15} className="animate-spin" /> Joining the call…
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => void call.start()} className={primary}>
                <Headset size={16} /> {call.error ? "Try again" : "Join the call"}
              </button>
              <button
                onClick={() => void humanApi.end(id).then(refresh).catch((e) => toast.error(apiErrorMessage(e, "Couldn't end it")))}
                className="rounded-lg border border-cream-200 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-cream-100 dark:hover:bg-navy-800"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── over: declined / expired / cancelled / ended ────────────────────────────
  const date = new Date(c.startedAt ?? c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const ended = c.status === "ENDED";
  const reason = c.endReason ? END_REASON_LABELS[c.endReason] ?? c.endReason : null;
  const title = ended
    ? `Consultation with ${c.advocate.name}`
    : c.status === "DECLINED"
      ? `${c.advocate.name} couldn't take this request`
      : c.status === "EXPIRED"
        ? "The request wasn't answered in time"
        : "The request was cancelled";

  return (
    <PageShell>
      <div className="p-6 space-y-5">
        {back}
        <div className={card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-medium">{title}</h1>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500 dark:text-cream-100/50 mt-1">
                <span>{date}</span>
                <span>{c.stateName}</span>
                {ended && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} /> {formatDuration(c.durationSec)}
                  </span>
                )}
                {reason && <span>{reason}</span>}
              </p>
            </div>
            {!ended && <XCircle size={22} className="text-gray-300 dark:text-white/20 shrink-0" aria-hidden />}
          </div>

          {c.status === "DECLINED" && c.declineReason && (
            <p className="text-sm rounded-lg bg-cream-100 dark:bg-navy-800 p-3">“{c.declineReason}”</p>
          )}
          {c.subject && (
            <p className="text-[13.5px] leading-relaxed rounded-lg bg-cream-100 dark:bg-navy-800 p-3">
              <span className="block text-[11px] font-mono uppercase tracking-wide text-gray-400 dark:text-cream-100/40 mb-1">
                What you asked about
              </span>
              {c.subject}
            </p>
          )}
          {ended && (
            <div>
              <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-2">
                Notes from your advocate
              </h2>
              {c.sharedNotes ? (
                <p className="text-[14px] leading-relaxed whitespace-pre-line rounded-lg border border-cream-200 dark:border-white/10 p-4">
                  {c.sharedNotes}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-cream-100/50">Your advocate didn't leave any notes for you.</p>
              )}
              <p className="text-[12px] text-gray-500 dark:text-cream-100/45 mt-3">
                The call was not recorded. What you were told is general legal guidance from your advocate.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={() => navigate("/connect-advocate")} className={primary}>
              {ended ? "Back to advocates" : "Try another advocate"}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cream-200 dark:border-white/15 px-4 py-2 text-sm font-medium text-risk-high-fg dark:text-risk-high-fg-dark hover:bg-risk-high-bg dark:hover:bg-risk-high-bg-dark"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this consultation?"
          message="It will be permanently removed from your account, including any notes your advocate shared."
          confirmLabel="Delete"
          danger
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </PageShell>
  );
}
