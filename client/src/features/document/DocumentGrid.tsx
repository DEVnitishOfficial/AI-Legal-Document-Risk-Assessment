import { useEffect, useState } from "react";
import { File, FileText, Star } from "lucide-react";
import API from "../../services/api";
import FormError from "../../components/ui/FormError";
import { apiErrorMessage } from "../../services/apiError";
import { RISK_LEVEL_BADGE } from "./riskStyles";
import { documentDisplayName } from "./documentApi";
import DocumentActionButtons from "./DocumentActionButtons";
import { useDocumentActions } from "./useDocumentActions";

interface DocumentGridProps {
  onSelect: (doc: any) => void;
  /** Fired after a document is deleted so the page can drop a stale report. */
  onDeleted?: (id: number) => void;
  refreshKey?: number;
  selectedId?: number | null;
}

const NEUTRAL_CHIP = "bg-cream-100 text-gray-500 dark:bg-navy-800 dark:text-cream-100/50";

// The verdict chip: the risk level once analyzed, otherwise what state the
// document is in, so a card is never left without a status.
const verdictFor = (doc: any): { label: string; className: string } => {
  const level = doc.analysis?.riskLevel;
  if (level && RISK_LEVEL_BADGE[level]) {
    return { label: `${level} risk`, className: RISK_LEVEL_BADGE[level] };
  }
  if (doc.status === "failed") {
    return { label: "Analysis failed", className: RISK_LEVEL_BADGE.High };
  }
  return { label: "Not analyzed yet", className: NEUTRAL_CHIP };
};

export default function DocumentGrid({ onSelect, onDeleted, refreshKey, selectedId }: DocumentGridProps) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    API.get("/documents/get-documents")
      .then((res) => setDocs(res.data.data))
      .catch((err) => setLoadError(apiErrorMessage(err, "We couldn't load your documents.")))
      .finally(() => setLoading(false));
  }, [refreshKey, retryKey]);

  const actions = useDocumentActions({
    onUpdated: (updated) => setDocs((list) => list.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))),
    onDeleted: (id) => {
      setDocs((list) => list.filter((d) => d.id !== id));
      onDeleted?.(id);
    },
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40">
          Every file, with its verdict at a glance
        </span>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cream-100 dark:bg-navy-800 text-navy-800 dark:text-cream-100/70">
          {docs.length} {docs.length === 1 ? "document" : "documents"}
        </span>
      </div>

      {loadError && (
        <div className="mb-4">
          <FormError message={loadError} />
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-2 text-[13px] font-semibold text-gold-600 dark:text-gold-400 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !loadError && docs.length === 0 && (
        <div className="rounded-xl border border-dashed border-cream-200 dark:border-white/15 py-12 text-center">
          <p className="font-display text-lg font-medium">No documents yet</p>
          <p className="text-sm text-gray-500 dark:text-cream-100/50 mt-1">
            Add one above — analyzed documents show up here as cards, each with its risk verdict.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {docs.map((doc) => {
          const isSelected = selectedId === doc.id;
          const verdict = verdictFor(doc);
          const label = documentDisplayName(doc);
          const subLabel = doc.documentType || (doc.filePath ? "Uploaded file" : "Pasted text");

          return (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(doc)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(doc);
                }
              }}
              aria-pressed={isSelected}
              className={`text-left cursor-pointer rounded-xl border p-5 flex flex-col gap-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 ${
                isSelected
                  ? "border-gold-500 bg-gold-500/5 dark:bg-navy-800"
                  : "border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 hover:border-gold-500/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="w-11 h-11 rounded-lg bg-cream-100 dark:bg-navy-800 flex items-center justify-center text-gray-500 dark:text-cream-100/60">
                  {doc.filePath ? <File size={20} /> : <FileText size={20} />}
                </span>
                {doc.isFavorite && (
                  <Star size={16} className="fill-gold-500 text-gold-500" aria-label="Favorite" />
                )}
              </div>

              <div className="min-w-0">
                <p className="font-semibold text-[15px] truncate" title={label}>
                  {label}
                </p>
                <p className="font-mono text-xs text-gray-400 dark:text-cream-100/40 mt-1 truncate">
                  {subLabel} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${verdict.className}`}>
                  {verdict.label}
                </span>
                <DocumentActionButtons
                  doc={doc}
                  onView={actions.view}
                  onFavorite={actions.toggleFavorite}
                  onRename={actions.rename}
                  onDelete={actions.remove}
                />
              </div>
            </div>
          );
        })}
      </div>

      {actions.dialogs}
    </section>
  );
}
