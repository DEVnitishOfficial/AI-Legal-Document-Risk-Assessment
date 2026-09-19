import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { File, FileText } from "lucide-react";
import API from "../../services/api";
import { RISK_LEVEL_BADGE } from "./riskStyles";

interface DocumentGridProps {
  onSelect: (doc: any) => void;
  refreshKey?: number;
  selectedId?: number | null;
}

const NEUTRAL_CHIP = "bg-cream-100 text-gray-500 dark:bg-navy-800 dark:text-cream-100/50";

const getFileName = (path?: string | null) => {
  if (!path) return "Text Document";
  return path.split("\\").pop()?.split("/").pop() || "Document";
};

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

export default function DocumentGrid({ onSelect, refreshKey, selectedId }: DocumentGridProps) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.get("/documents/get-documents")
      .then((res) => setDocs(res.data.data))
      .finally(() => setLoading(false));
  }, [refreshKey]);

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

      {!loading && docs.length === 0 && (
        <div className="rounded-xl border border-dashed border-cream-200 dark:border-white/15 py-14 text-center">
          <p className="font-display text-lg font-medium">No documents yet</p>
          <p className="text-sm text-gray-500 dark:text-cream-100/50 mt-1 mb-5">
            Analyzed documents show up here as cards, each with its risk verdict.
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-navy-900 hover:bg-navy-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-cream-50 dark:text-navy-950 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Analyze your first document
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {docs.map((doc) => {
          const isSelected = selectedId === doc.id;
          const verdict = verdictFor(doc);
          const label = doc.title || getFileName(doc.filePath);
          const subLabel = doc.documentType || (doc.filePath ? "Uploaded file" : "Pasted text");

          return (
            <button
              key={doc.id}
              onClick={() => onSelect(doc)}
              aria-pressed={isSelected}
              className={`text-left rounded-xl border p-5 flex flex-col gap-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 ${
                isSelected
                  ? "border-gold-500 bg-gold-500/5 dark:bg-navy-800"
                  : "border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 hover:border-gold-500/50"
              }`}
            >
              <span className="w-11 h-11 rounded-lg bg-cream-100 dark:bg-navy-800 flex items-center justify-center text-gray-500 dark:text-cream-100/60">
                {doc.filePath ? <File size={20} /> : <FileText size={20} />}
              </span>

              <div className="min-w-0">
                <p className="font-semibold text-[15px] truncate" title={label}>
                  {label}
                </p>
                <p className="font-mono text-xs text-gray-400 dark:text-cream-100/40 mt-1 truncate">
                  {subLabel} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>

              <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full ${verdict.className}`}>
                {verdict.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
