import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Clock, Loader2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import PageShell from "../features/consultation/PageShell";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import {
  apiErrorMessage,
  consultationApi,
  formatDuration,
  type ConsultationListItem,
} from "../features/consultation/consultationApi";

const STATUS_LABEL: Record<string, string> = {
  LOBBY: "Not started",
  LIVE: "In progress",
  ENDED: "Completed",
  FAILED: "Not completed",
};

export default function ConsultationHistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ConsultationListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ConsultationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    consultationApi
      .list()
      .then(setItems)
      .catch((err) => setError(apiErrorMessage(err, "Could not load your consultations.")));
  }, []);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await consultationApi.remove(toDelete.id);
      setItems((prev) => prev?.filter((i) => i.id !== toDelete.id) ?? null);
      setToDelete(null);
      toast.success("Consultation deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delete it."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell>
      <div className="p-6 space-y-6 max-w-4xl">
        <Link
          to="/connect-advocate"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-cream-100/50 hover:text-navy-950 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
        >
          <ArrowLeft size={15} /> Connect Advocate
        </Link>
        <div>
          <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-gold-600 dark:text-gold-400">History</span>
          <h1 className="font-display text-2xl font-medium mt-1">Your consultations</h1>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-risk-high-bg dark:bg-risk-high-bg-dark text-risk-high-fg dark:text-risk-high-fg-dark p-4 text-sm">
            {error}
          </p>
        )}
        {!items && !error && (
          <p className="flex items-center gap-2 text-sm text-gray-500" role="status">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </p>
        )}

        {items && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-cream-200 dark:border-white/15 p-8 text-center">
            <p className="font-display text-lg">No consultations yet</p>
            <p className="text-sm text-gray-500 dark:text-cream-100/50 mt-1">Your transcripts and summaries will be kept here.</p>
            <button
              onClick={() => navigate("/connect-advocate")}
              className="mt-4 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm px-5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
            >
              Start a consultation
            </button>
          </div>
        )}

        {items && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 p-4"
              >
                <button
                  onClick={() => navigate(`/connect-advocate/session/${c.id}`)}
                  className="flex-1 min-w-0 flex items-center gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 rounded"
                >
                  <span className="w-10 h-10 shrink-0 rounded-full border border-gold-500 bg-navy-950 text-gold-400 flex items-center justify-center">
                    <Bot size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-[14.5px] truncate">{c.advocateName}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-gray-500 dark:text-cream-100/50">
                      <span>{new Date(c.startedAt ?? c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {formatDuration(c.durationSec)}
                      </span>
                      <span>{STATUS_LABEL[c.status]}</span>
                      {c.status === "ENDED" && c.summaryStatus === "READY" && <span className="text-risk-low-fg dark:text-risk-low-fg-dark">Summary ready</span>}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setToDelete(c)}
                  aria-label={`Delete consultation with ${c.advocateName} on ${new Date(c.createdAt).toLocaleDateString()}`}
                  disabled={c.status === "LIVE"}
                  className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-risk-high-fg dark:hover:text-risk-high-fg-dark hover:bg-risk-high-bg dark:hover:bg-risk-high-bg-dark disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete this consultation?"
          message="The transcript and summary will be permanently removed from your account."
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </PageShell>
  );
}
