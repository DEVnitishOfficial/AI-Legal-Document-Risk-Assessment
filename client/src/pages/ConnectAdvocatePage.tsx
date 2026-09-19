import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, History, Loader2, MessagesSquare, UserRound, Users } from "lucide-react";
import PageShell from "../features/consultation/PageShell";
import PageIntro from "../components/layout/PageIntro";
import AdvocateCard from "../features/consultation/AdvocateCard";
import { apiErrorMessage, consultationApi, type PublicAdvocate } from "../features/consultation/consultationApi";

export default function ConnectAdvocatePage() {
  const navigate = useNavigate();
  const [advocates, setAdvocates] = useState<PublicAdvocate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    consultationApi
      .advocates()
      .then(setAdvocates)
      .catch((err) => setError(apiErrorMessage(err, "Could not load advocates.")));
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
          <>
            <section aria-labelledby="ai-heading">
              <h2
                id="ai-heading"
                className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-3"
              >
                AI advocate
              </h2>
              {ai.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-cream-100/50">The AI advocate isn't available right now.</p>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 max-w-5xl">
                  {ai.map((a) => (
                    <AdvocateCard key={a.id} advocate={a} onStart={() => navigate(`/connect-advocate/join/${a.slug}`)} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="human-heading">
              <h2
                id="human-heading"
                className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-3"
              >
                Human advocates
              </h2>
              {humans.length === 0 ? (
                <div className="max-w-5xl rounded-xl border border-dashed border-cream-200 dark:border-white/15 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="w-12 h-12 shrink-0 rounded-full border-2 border-dashed border-gold-500/60 text-gold-500 flex items-center justify-center">
                    <UserRound size={22} />
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-base font-medium">Coming soon</p>
                    <p className="text-sm text-gray-600 dark:text-cream-100/60 mt-0.5 max-w-2xl">
                      Verified advocates, enrolled with their State Bar Council, will be listed here with their degrees,
                      courts and languages, so you can talk to a real lawyer too.
                    </p>
                  </div>
                  <button
                    disabled
                    className="rounded-lg border border-cream-200 dark:border-white/10 text-gray-400 dark:text-cream-100/40 text-sm font-medium px-5 py-2.5 cursor-not-allowed"
                  >
                    Coming soon
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 max-w-5xl">
                  {humans.map((a) => (
                    <AdvocateCard key={a.id} advocate={a} unavailableLabel="Coming soon" />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
