import { useEffect, useState } from "react";
import API from "../services/api";
import { FileText, File } from "lucide-react";

interface DocumentListProps {
  onSelect: (doc: any) => void;
  refreshKey?: number;
  selectedId?: number | null;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-gold-500",
  completed: "bg-risk-low-fg dark:bg-risk-low-fg-dark",
  failed: "bg-risk-high-fg dark:bg-risk-high-fg-dark",
};

export default function DocumentList({ onSelect, refreshKey, selectedId }: DocumentListProps) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.get("/documents/get-documents")
      .then((res) => {
        setDocs(res.data.data);
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const getFileName = (path: string) => {
    if (!path) return "Text Document";
    return path?.split("\\").pop().split("/").pop();
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-cream-200 text-navy-950 dark:bg-navy-900 dark:border-white/10 dark:text-cream-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-cream-100/40">Your Documents</h2>
        <span className="text-xs text-gray-400 dark:text-cream-100/40">
          {docs.length} items
        </span>
      </div>

      {/* Empty State */}
      {!loading && docs.length === 0 && (
        <div className="text-center text-gray-400 dark:text-cream-100/40 py-10">
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs mt-1">Upload or paste text to get started</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
        {docs.map((doc: any) => {
          const label = doc.title || getFileName(doc.filePath);
          const subLabel = doc.documentType || (doc.filePath ? "Uploaded file" : "Pasted text");
          const isSelected = selectedId === doc.id;

          return (
            <div
              key={doc.id}
              onClick={() => onSelect(doc)}
              className={`
                flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all
                border-l-2
                ${
                  isSelected
                    ? "bg-cream-100 border-gold-500 dark:bg-navy-800"
                    : "border-transparent hover:bg-cream-50 dark:hover:bg-navy-800/60"
                }
              `}
            >
              {/* Icon */}
              <div className="p-2 bg-cream-100 dark:bg-navy-800 rounded-lg text-gray-500 dark:text-cream-100/50">
                {doc.filePath ? (
                  <File size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 overflow-hidden">
                <p className="text-[13px] font-semibold truncate">
                  {label}
                </p>
                <p className="text-[11.5px] text-gray-400 dark:text-cream-100/40 truncate font-mono">
                  {subLabel} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Status dot: pending/completed/failed */}
              <div
                title={doc.status}
                className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[doc.status] || "bg-gray-400"}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
