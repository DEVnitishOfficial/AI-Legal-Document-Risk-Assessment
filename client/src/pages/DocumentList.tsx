import { useEffect, useState } from "react";
import API from "../services/api";
import { FileText, File } from "lucide-react";

export default function DocumentList({ onSelect }: any) {
  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    API.get("/documents/get-documents").then((res) => {
      setDocs(res.data.data);
    });
  }, []);

  console.log('docs>>>>', docs);

  const getFileName = (path: string) => {
    if (!path) return "Text Document";
    return path?.split("\\").pop().split("/").pop();
  };

  return (
    <div className="bg-gray-900 p-5 rounded-2xl mt-4 border border-gray-800 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Your Documents</h2>
        <span className="text-xs text-gray-400">
          {docs.length} items
        </span>
      </div>

      {/* Empty State */}
      {docs.length === 0 && (
        <div className="text-center text-gray-400 py-10">
          <p>No documents yet</p>
          <p className="text-sm">Upload or paste text to get started</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {docs.map((doc: any) => {
          const fileName = getFileName(doc.file_path);
          const isSelected = selectedId === doc.id;

          return (
            <div
              key={doc.id}
              onClick={() => {
                setSelectedId(doc.id);
                onSelect(doc);
              }}
              className={`
                flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                border
                ${
                  isSelected
                    ? "bg-purple-600/20 border-purple-500"
                    : "bg-gray-800 border-transparent hover:bg-gray-700"
                }
              `}
            >
              {/* Icon */}
              <div className="p-2 bg-gray-700 rounded-lg">
                {doc.file_path ? (
                  <File size={18} />
                ) : (
                  <FileText size={18} />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {fileName}
                </p>
                <p className="text-xs text-gray-400">
                  {doc.file_path ? "Uploaded file" : "Pasted text"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Optional status dot */}
              {isSelected && (
                <div className="w-2 h-2 bg-purple-400 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}