import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Headset, Loader2 } from "lucide-react";
import PageShell from "../features/consultation/PageShell";
import CallRoom from "../features/consultation/CallRoom";
import SummaryView from "../features/consultation/SummaryView";
import { useConsultationCall } from "../features/consultation/useConsultationCall";
import { apiErrorMessage, consultationApi, type Consultation } from "../features/consultation/consultationApi";

const IN_CALL = ["requesting-mic", "connecting", "live", "ending"];

export default function ConsultationRoomPage() {
  const id = Number(useParams().id);
  const location = useLocation();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const autostarted = useRef(false);

  const call = useConsultationCall(id, setConsultation);

  const refresh = useCallback(async () => {
    try {
      setConsultation(await consultationApi.get(id));
    } catch (err: any) {
      setLoadError(apiErrorMessage(err, err?.response?.status === 404 ? "Consultation not found." : "Could not load the consultation."));
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Coming from the check-in page: start the call straight away (permission was just granted there).
  useEffect(() => {
    if (location.state?.autostart && !autostarted.current && consultation?.status === "LOBBY" && call.phase === "idle") {
      autostarted.current = true;
      navigate(location.pathname, { replace: true, state: null });
      void call.start();
    }
  }, [consultation, call, location, navigate]);

  // The summary is written right after the call ends; keep checking until it lands.
  useEffect(() => {
    if (consultation?.status !== "ENDED" || consultation.summaryStatus !== "PENDING") return;
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [consultation?.status, consultation?.summaryStatus, refresh]);

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

  if (!consultation) {
    return (
      <PageShell>
        <p className="p-6 flex items-center gap-2 text-sm text-gray-500" role="status">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </p>
      </PageShell>
    );
  }

  // A call in progress (or being set up / torn down) in this browser.
  if (IN_CALL.includes(call.phase)) {
    return (
      <PageShell>
        <CallRoom consultation={consultation} call={call} />
      </PageShell>
    );
  }

  // Not started yet (or the browser refused the microphone / the connection failed).
  if (consultation.status === "LOBBY") {
    return (
      <PageShell>
        <div className="p-6 space-y-5 max-w-2xl">
          {back}
          <div>
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-gold-600 dark:text-gold-400">Ready</span>
            <h1 className="font-display text-2xl font-medium mt-1">Start your call with {consultation.advocate.name}</h1>
            <p className="text-sm text-gray-600 dark:text-cream-100/60 mt-1">
              {consultation.stateName} · the conversation is transcribed and saved to your account.
            </p>
          </div>
          {call.error && (
            <p role="alert" className="rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-3 text-sm">
              {call.error}
            </p>
          )}
          <button
            onClick={() => void call.start()}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm px-6 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <Headset size={16} /> {call.error ? "Try again" : "Start the call"}
          </button>
        </div>
      </PageShell>
    );
  }

  // The record says live but this browser isn't connected (e.g. the page was refreshed).
  if (consultation.status === "LIVE") {
    return (
      <PageShell>
        <div className="p-6 space-y-4 max-w-2xl">
          {back}
          <p className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-5 text-sm leading-relaxed">
            This consultation is still marked as live, but this browser is no longer connected to the call. It closes
            automatically within moments — or you can end it now to get your summary.
          </p>
          <button
            onClick={async () => setConsultation(await consultationApi.end(id))}
            className="rounded-lg bg-maroon-700 hover:bg-maroon-800 text-white text-sm font-semibold px-5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-maroon-700"
          >
            End it now
          </button>
        </div>
      </PageShell>
    );
  }

  // ENDED / FAILED: the summary and transcript.
  return (
    <PageShell>
      <div className="px-6 pt-5">{back}</div>
      <SummaryView consultation={consultation} loadTurns={() => consultationApi.turns(id, 0)} onDelete={remove} />
    </PageShell>
  );
}
