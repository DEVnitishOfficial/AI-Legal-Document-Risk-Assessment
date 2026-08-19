import { useEffect, useState } from "react";
import API from "../services/api";
import { FileText, File } from "lucide-react";

interface DocumentListProps {
  onSelect: (doc: any) => void;
  refreshKey?: number;
  selectedId?: number | null;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-gray-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
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
    <div className="bg-gray-50 p-5 rounded-2xl mt-4 border border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-800 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Your Documents</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {docs.length} items
        </span>
      </div>

      {/* Empty State */}
      {!loading && docs.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-10">
          <p>No documents yet</p>
          <p className="text-sm">Upload or paste text to get started</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {docs.map((doc: any) => {
          const label = doc.title || getFileName(doc.filePath);
          const subLabel = doc.documentType || (doc.filePath ? "Uploaded file" : "Pasted text");
          const isSelected = selectedId === doc.id;

          return (
            <div
              key={doc.id}
              onClick={() => onSelect(doc)}
              className={`
                flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                border
                ${
                  isSelected
                    ? "bg-purple-600/10 border-purple-500 dark:bg-purple-600/20"
                    : "bg-white border-transparent hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                }
              `}
            >
              {/* Icon */}
              <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                {doc.filePath ? (
                  <File size={18} />
                ) : (
                  <FileText size={18} />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {subLabel}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Status dot: pending/completed/failed */}
              <div
                title={doc.status}
                className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[doc.status] || "bg-gray-500"}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
