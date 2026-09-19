import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageShell from "../features/consultation/PageShell";
import LobbyPanel from "../features/consultation/LobbyPanel";
import {
  apiErrorMessage,
  consultationApi,
  type ConsultationOptions,
  type PublicAdvocate,
} from "../features/consultation/consultationApi";

// Pre-join: pick the state and language, test the microphone, accept the notice.
// Nothing is created (or billed) until "Join consultation" is pressed.
export default function JoinConsultationPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [advocate, setAdvocate] = useState<PublicAdvocate | null>(null);
  const [options, setOptions] = useState<ConsultationOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([consultationApi.advocates(), consultationApi.options()])
      .then(([advocates, opts]) => {
        const found = advocates.find((a) => a.slug === slug && a.kind === "AI");
        if (!found) setLoadError("That advocate isn't available.");
        setAdvocate(found ?? null);
        setOptions(opts);
      })
      .catch((err) => setLoadError(apiErrorMessage(err, "Could not load the consultation options.")));
  }, [slug]);

  const join = async ({ state, language }: { state: string; language: string }) => {
    if (!advocate) return;
    setJoining(true);
    setJoinError(null);
    try {
      const c = await consultationApi.create({ advocateId: advocate.id, state, language, consent: true });
      // The room starts the call itself; the flag lets it do so without a second click.
      navigate(`/connect-advocate/session/${c.id}`, { state: { autostart: true } });
    } catch (err) {
      setJoinError(apiErrorMessage(err, "Could not start the consultation."));
      setJoining(false);
    }
  };

  return (
    <PageShell>
      <div className="p-6 space-y-6">
        <Link
          to="/connect-advocate"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-cream-100/50 hover:text-navy-950 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
        >
          <ArrowLeft size={15} /> All advocates
        </Link>

        {loadError && (
          <p role="alert" className="max-w-2xl rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-4 text-sm">
            {loadError}
          </p>
        )}

        {!advocate && !loadError && (
          <p className="flex items-center gap-2 text-sm text-gray-500" role="status">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </p>
        )}

        {advocate && options && (
          <>
            <div>
              <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-gold-600 dark:text-gold-400">
                Check in
              </span>
              <h1 className="font-display text-2xl font-medium mt-1">Before you speak with {advocate.displayName}</h1>
            </div>
            <LobbyPanel advocate={advocate} options={options} busy={joining} error={joinError} onJoin={join} />
          </>
        )}
      </div>
    </PageShell>
  );
}
