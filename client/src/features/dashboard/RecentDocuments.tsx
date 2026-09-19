import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, File, FileText, Star } from "lucide-react";
import DocumentActionButtons from "../document/DocumentActionButtons";
import { RISK_LEVEL_BADGE } from "../document/riskStyles";
import { documentDisplayName } from "../document/documentApi";

const RECENT_COUNT = 5;

interface RecentDocumentsProps {
  documents: any[];
  loading: boolean;
  actions: {
    view: (doc: any) => void;
    toggleFavorite: (doc: any) => void;
    rename: (doc: any) => void;
    remove: (doc: any) => void;
  };
}

const Chip = ({ doc }: { doc: any }) => {
  const level = doc.analysis?.riskLevel;
  const cls = level && RISK_LEVEL_BADGE[level]
    ? RISK_LEVEL_BADGE[level]
    : "bg-cream-100 text-gray-500 dark:bg-navy-800 dark:text-cream-100/50";
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>
      {level ? `${level} risk` : "Not analyzed"}
    </span>
  );
};

export default function RecentDocuments({ documents, loading, actions }: RecentDocumentsProps) {
  const navigate = useNavigate();
  const recent = documents.slice(0, RECENT_COUNT);

  return (
    <section className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-medium">Recent documents</h2>
          <p className="text-xs text-gray-500 dark:text-cream-100/50 mt-0.5">Your latest analyzed files</p>
        </div>
        <Link
          to="/documents"
          className="flex items-center gap-0.5 text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline"
        >
          View all <ChevronRight size={14} />
        </Link>
      </div>

      {!loading && recent.length === 0 ? (
        <div className="px-5 pb-8 pt-2 text-center">
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs text-gray-500 dark:text-cream-100/50 mt-1 mb-4 max-w-sm mx-auto">
            Upload a lease, notice or contract and NyayMitra will score its risk and flag the clauses to watch.
          </p>
          <button
            onClick={() => navigate("/documents")}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-navy-900 text-cream-50 hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400 transition-colors"
          >
            Analyze your first document
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-cream-200 dark:border-white/10 text-left text-[11px] uppercase tracking-wide text-gray-400 dark:text-cream-100/40">
                <th className="px-5 py-2.5 font-semibold">File name</th>
                <th className="px-3 py-2.5 font-semibold">Type</th>
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Risk</th>
                <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b last:border-b-0 border-cream-200 dark:border-white/10 hover:bg-cream-50 dark:hover:bg-navy-800/50 transition-colors"
                >
                  <td className="px-5 py-3 max-w-[210px]">
                    <Link
                      to={`/documents?doc=${doc.id}`}
                      title="Open the analysis report"
                      className="flex items-center gap-2.5 min-w-0 font-semibold hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                    >
                      <span className="shrink-0 text-gray-400 dark:text-cream-100/40">
                        {doc.filePath ? <File size={16} /> : <FileText size={16} />}
                      </span>
                      <span className="truncate">{documentDisplayName(doc)}</span>
                      {doc.isFavorite && <Star size={12} className="shrink-0 fill-gold-500 text-gold-500" />}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-cream-100/50 whitespace-nowrap">
                    {doc.documentType || (doc.filePath ? "Uploaded file" : "Pasted text")}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500 dark:text-cream-100/50 whitespace-nowrap">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <Chip doc={doc} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <DocumentActionButtons
                        doc={doc}
                        onView={actions.view}
                        onFavorite={actions.toggleFavorite}
                        onRename={actions.rename}
                        onDelete={actions.remove}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
