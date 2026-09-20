import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Bell, BellOff, Check, Clock, Headset, Loader2, PhoneIncoming, Radio, WifiOff, X } from "lucide-react";
import FormError from "../components/ui/FormError";
import PageShell from "../features/consultation/PageShell";
import { useHub } from "../features/human/useHub";
import { askNotificationPermission, chime, desktopNotify, notificationsSupported, useNow } from "../features/human/deskAlerts";
import { apiErrorMessage, humanApi, type DeskConsultation, type DeskData } from "../features/human/humanApi";
import { END_REASON_LABELS, formatDuration } from "../features/consultation/consultationApi";

const STATUS_LABEL: Record<string, string> = {
  ENDED: "Completed",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

function RequestCard({
  r,
  now,
  onAccept,
  onDecline,
  busy,
}: {
  r: DeskConsultation;
  now: number;
  onAccept: () => void;
  onDecline: (reason: string) => void;
  busy: boolean;
}) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const left = r.expiresAt ? Math.max(0, Math.round((new Date(r.expiresAt).getTime() - now) / 1000)) : null;

  return (
    <li className="rounded-xl border-2 border-gold-500/60 bg-white dark:bg-navy-900 p-5 space-y-3" data-testid="request-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-medium">{r.clientName}</p>
          <p className="text-[13px] text-gray-500 dark:text-cream-100/50">
            {r.stateName} · {r.language === "hi" ? "Hindi" : "English"}
          </p>
        </div>
        {left !== null && (
          <span className="inline-flex items-center gap-1 text-[12px] font-mono text-gray-500 dark:text-cream-100/50">
            <Clock size={12} /> {formatDuration(left)}
          </span>
        )}
      </div>
      {r.subject && <p className="text-[14px] leading-relaxed rounded-lg bg-cream-100 dark:bg-navy-800 p-3">{r.subject}</p>}

      {declining ? (
        <div className="space-y-2">
          <label htmlFor={`reason-${r.id}`} className="text-[12.5px] text-gray-500 dark:text-cream-100/50">
            Optional — tell them why (they will see this)
          </label>
          <input
            id={`reason-${r.id}`}
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Outside my practice area"
            className="w-full rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-navy-950 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
          />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => onDecline(reason)} className={`${btn} bg-maroon-700 hover:bg-maroon-800 text-white`}>
              Decline request
            </button>
            <button onClick={() => setDeclining(false)} className={`${btn} border border-cream-200 dark:border-white/15`}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button disabled={busy} onClick={onAccept} className={`${btn} bg-gold-500 hover:bg-gold-400 text-navy-950`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Accept
          </button>
          <button
            disabled={busy}
            onClick={() => setDeclining(true)}
            className={`${btn} border border-cream-200 dark:border-white/15 hover:bg-cream-100 dark:hover:bg-navy-800`}
          >
            <X size={15} /> Decline
          </button>
        </div>
      )}
    </li>
  );
}

export default function AdvocateDeskPage() {
  const navigate = useNavigate();
  const hub = useHub();
  const now = useNow();
  const [desk, setDesk] = useState<DeskData | null>(null);
  const [connected, setConnected] = useState(false);
  // The desk refreshes itself every 10 s; this is why the last refresh failed (null when it worked).
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    notificationsSupported() ? Notification.permission : "unsupported"
  );
  const seen = useRef(new Set<number>());
  const baseTitle = useRef(document.title);

  const load = useCallback(async () => {
    try {
      setDesk(await humanApi.desk());
      setLoadError(null);
    } catch (err: any) {
      if (err?.response?.status === 403) navigate("/dashboard", { replace: true });
      else setLoadError(apiErrorMessage(err, "We couldn't load your desk."));
    }
  }, [navigate]);

  useEffect(() => void load(), [load]);
  useEffect(() => {
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, [load]);

  // Open the desk on the realtime connection (and again after any reconnect): this is what
  // makes the advocate reachable, together with the "Available now" switch.
  useEffect(() => {
    if (!hub) return;
    hub.send({ type: "desk.open" });
    hub.onReady = () => hub.send({ type: "desk.open" });
    const offs = [
      hub.on("desk.state", () => {
        setConnected(true);
        void load();
      }),
      hub.on("disconnected", () => setConnected(false)),
      hub.on("request.new", (m) => {
        void load();
        chime();
        document.title = "● New consultation request";
        desktopNotify("New consultation request", `${m.consultation.clientName} — ${m.consultation.stateName}`);
      }),
      hub.on("request.update", () => void load()),
    ];
    return () => {
      offs.forEach((off) => off());
      hub.onReady = null;
      document.title = baseTitle.current;
    };
  }, [hub, load]);

  // Restore the tab title once the request that changed it has been dealt with.
  useEffect(() => {
    if (desk && desk.pending.length === 0) document.title = baseTitle.current;
  }, [desk]);

  // A request already waiting when the page opens should also be noticed.
  useEffect(() => {
    desk?.pending.forEach((r) => seen.current.add(r.id));
  }, [desk]);

  const setAvailable = async (on: boolean) => {
    setToggling(true);
    try {
      const res = await humanApi.setAvailable(on);
      setDesk((d) => (d ? { ...d, online: res.online, wantsAvailable: res.wantsAvailable } : d));
      toast.success(on ? "You're available — clients can now request a consultation" : "You're offline");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't change your availability"));
    } finally {
      setToggling(false);
    }
  };

  const accept = async (r: DeskConsultation) => {
    setBusyId(r.id);
    try {
      await humanApi.accept(r.id);
      navigate(`/advocate/session/${r.id}`, { state: { autostart: true } });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't accept this request"));
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (r: DeskConsultation, reason: string) => {
    setBusyId(r.id);
    try {
      await humanApi.decline(r.id, reason);
      void load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't decline this request"));
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const enableAlerts = async () => setPermission(await askNotificationPermission());

  if (!desk) {
    return (
      <PageShell>
        {loadError ? (
          <div className="p-6 max-w-xl">
            <FormError message={loadError} />
            <p className="text-sm text-gray-500 dark:text-cream-100/50 mt-3">We'll keep trying automatically.</p>
          </div>
        ) : (
          <p className="p-6 flex items-center gap-2 text-sm text-gray-500" role="status">
            <Loader2 size={16} className="animate-spin" /> Loading your desk…
          </p>
        )}
      </PageShell>
    );
  }

  const canToggle = connected && !toggling && (desk.online || !desk.blockedReason);

  return (
    <PageShell>
      <div className="p-6 space-y-8 max-w-4xl">
        <div>
          <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-gold-600 dark:text-gold-400">Advocate desk</span>
          <h1 className="font-display text-2xl font-medium mt-1">Welcome, {desk.advocate.displayName}</h1>
        </div>

        {loadError && (
          <FormError message={`${loadError} You may miss new requests until the connection is back — this page keeps retrying.`} />
        )}

        {/* availability */}
        <section
          aria-labelledby="avail-h"
          className={`rounded-xl border p-5 ${
            desk.online ? "border-risk-low-fg/40 bg-risk-low-bg/40 dark:bg-risk-low-bg-dark/40" : "border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 id="avail-h" className="flex items-center gap-2 font-display text-lg font-medium">
                {desk.online ? <Radio size={18} className="text-risk-low-fg dark:text-risk-low-fg-dark" /> : <WifiOff size={18} className="text-gray-400" />}
                {desk.online ? "You're available" : "You're offline"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-cream-100/60 mt-1 max-w-xl">
                {desk.online
                  ? "Clients can request a consultation with you. Keep this page open so you hear them — closing it makes you unavailable."
                  : "Switch on Available now when you're ready to take consultations. Clients see you as offline until you do."}
              </p>
              {!connected && <p className="text-[12.5px] text-risk-med-fg dark:text-risk-med-fg-dark mt-2">Connecting your desk…</p>}
              {desk.blockedReason && !desk.online && (
                <p role="alert" className="text-[13px] text-risk-med-fg dark:text-risk-med-fg-dark mt-2">
                  {desk.blockedReason}
                </p>
              )}
            </div>
            <button
              role="switch"
              aria-checked={desk.online}
              aria-label="Available now"
              disabled={!canToggle}
              onClick={() => void setAvailable(!desk.online)}
              className={`relative shrink-0 w-16 h-9 rounded-full transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 ${
                desk.online ? "bg-risk-low-fg" : "bg-gray-300 dark:bg-white/20"
              }`}
            >
              <span className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow transition-all ${desk.online ? "left-8" : "left-1"}`} />
            </button>
          </div>

          {permission !== "unsupported" && (
            <div className="mt-4 pt-4 border-t border-cream-200 dark:border-white/10 flex flex-wrap items-center gap-3 text-[13px] text-gray-600 dark:text-cream-100/60">
              {permission === "granted" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Bell size={14} /> Desktop alerts are on — you'll hear a chime and see a notification when a request arrives.
                </span>
              ) : permission === "denied" ? (
                <span className="inline-flex items-center gap-1.5">
                  <BellOff size={14} /> Desktop alerts are blocked in your browser settings. You'll still hear a chime while this page is open.
                </span>
              ) : (
                <>
                  <span>Get a desktop alert when a request arrives.</span>
                  <button onClick={enableAlerts} className={`${btn} border border-cream-200 dark:border-white/15 py-1.5`}>
                    <Bell size={14} /> Turn on alerts
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {/* incoming */}
        <section aria-labelledby="req-h">
          <h2 id="req-h" className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-3">
            Requests waiting {desk.pending.length > 0 && `(${desk.pending.length})`}
          </h2>
          {desk.pending.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-cream-100/50 rounded-xl border border-dashed border-cream-200 dark:border-white/15 p-5">
              <PhoneIncoming size={16} /> No one is waiting. New requests appear here the moment they arrive.
            </p>
          ) : (
            <ul className="space-y-3">
              {desk.pending.map((r) => (
                <RequestCard key={r.id} r={r} now={now} busy={busyId === r.id} onAccept={() => void accept(r)} onDecline={(reason) => void decline(r, reason)} />
              ))}
            </ul>
          )}
        </section>

        {/* in progress */}
        {desk.active.length > 0 && (
          <section aria-labelledby="act-h">
            <h2 id="act-h" className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-3">
              In progress
            </h2>
            <ul className="space-y-3">
              {desk.active.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-4">
                  <div>
                    <p className="font-semibold">{a.clientName}</p>
                    <p className="text-[13px] text-gray-500 dark:text-cream-100/50">
                      {a.status === "LIVE" ? "Call in progress" : "Accepted — waiting to join"} · {a.stateName}
                    </p>
                  </div>
                  <button onClick={() => navigate(`/advocate/session/${a.id}`, { state: { autostart: true } })} className={`${btn} bg-gold-500 hover:bg-gold-400 text-navy-950`}>
                    <Headset size={15} /> {a.status === "LIVE" ? "Rejoin call" : "Join call"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* history */}
        <section aria-labelledby="hist-h">
          <h2 id="hist-h" className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-3">
            Past consultations
          </h2>
          {desk.history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-cream-100/50">Your completed consultations and their notes will be listed here.</p>
          ) : (
            <ul className="space-y-2">
              {desk.history.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => navigate(`/advocate/session/${h.id}`)}
                    className="w-full text-left flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 hover:border-gold-500/50 p-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
                  >
                    <span>
                      <span className="block font-semibold text-[14.5px]">{h.clientName}</span>
                      <span className="block text-[12.5px] text-gray-500 dark:text-cream-100/50">
                        {new Date(h.startedAt ?? h.requestedAt ?? Date.now()).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                        {STATUS_LABEL[h.status] ?? h.status}
                        {h.status === "ENDED" ? ` · ${formatDuration(h.durationSec)}` : h.endReason ? ` · ${END_REASON_LABELS[h.endReason] ?? h.endReason}` : ""}
                      </span>
                    </span>
                    {h.status === "ENDED" && (
                      <span className="text-[12px] text-gold-600 dark:text-gold-400">{h.privateNotes || h.sharedNotes ? "View notes" : "Add notes"}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
