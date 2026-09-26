import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, History, Loader2, MessagesSquare, Users } from "lucide-react";
import PageShell from "../features/consultation/PageShell";
import PageIntro from "../components/layout/PageIntro";
import AdvocateCard from "../features/consultation/AdvocateCard";
import HumanAdvocatesSoonCard from "../features/consultation/HumanAdvocatesSoonCard";
import { apiErrorMessage, consultationApi, type PublicAdvocate } from "../features/consultation/consultationApi";

export default function ConnectAdvocatePage() {
  const navigate = useNavigate();
  const [advocates, setAdvocates] = useState<PublicAdvocate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      consultationApi
        .advocates()
        .then((list) => {
          setAdvocates(list);
          setError(null);
        })
        .catch((err) => setError(apiErrorMessage(err, "Could not load advocates.")));
    void load();
    // Real advocates come and go, so their availability is refreshed while this page is open.
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  const ai = advocates?.filter((a) => a.kind === "AI") ?? [];
  const humans = advocates?.filter((a) => a.kind === "HUMAN") ?? [];

  return (
    <PageShell>
      <PageIntro
        storageKey="connect-advocate"
        eyebrow="Talk it through"
        title="Speak with an advocate, live"
        description="Describe your situation out loud and get a conversation, not a search result. The advocate asks the questions a lawyer would, then explains which provisions apply, your realistic options and what to expect from each — and leaves the decision to you."
        points={[
          { icon: Users, title: "1. Choose who to speak with", text: "Start with NyayMitra's AI Advocate. Human advocates will appear here too." },
          { icon: MessagesSquare, title: "2. Have the conversation", text: "Check your microphone, then talk. You'll see the transcript and the sources it relies on." },
          { icon: ClipboardCheck, title: "3. Keep the summary", text: "Afterwards you get a written summary with next steps, saved in your account." },
        ]}
      />

      <div className="p-6 space-y-8">
        <div className="flex justify-end -mb-4">
          <button
            onClick={() => navigate("/connect-advocate/history")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 dark:text-gold-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
          >
            <History size={15} /> Past consultations
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-4 text-sm">
            {error}
          </p>
        )}

        {!advocates && !error && (
          <p className="flex items-center gap-2 text-sm text-gray-500" role="status">
            <Loader2 size={16} className="animate-spin" /> Loading advocates…
          </p>
        )}

        {advocates && (
          // The AI advocate and the human advocates share one row of equal-sized cards.
          <div className="grid gap-5 md:grid-cols-2 max-w-4xl items-start">
            {ai.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-cream-100/50">The AI advocate isn't available right now.</p>
            )}
            {ai.map((a) => (
              <AdvocateCard key={a.id} advocate={a} onStart={() => navigate(`/connect-advocate/join/${a.slug}`)} />
            ))}
            {humans.length === 0 ? (
              <HumanAdvocatesSoonCard />
            ) : (
              humans.map((a) => (
                <AdvocateCard
                  key={a.id}
                  advocate={a}
                  onStart={a.availability === "AVAILABLE" ? () => navigate(`/connect-advocate/join/${a.slug}`) : undefined}
                  unavailableLabel={
                    a.availability === "AVAILABLE" ? undefined : a.availability === "BUSY" ? "In a consultation" : "Offline right now"
                  }
                />
              ))
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
