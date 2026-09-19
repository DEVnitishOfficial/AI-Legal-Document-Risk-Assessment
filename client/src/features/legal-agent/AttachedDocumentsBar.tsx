import { FileText } from "lucide-react";
import type { AttachedDocument } from "./types";

interface AttachedDocumentsBarProps {
    documents: AttachedDocument[];
    onView: (documentId: number) => void;
}

export default function AttachedDocumentsBar({ documents, onView }: AttachedDocumentsBarProps) {
    if (documents.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-cream-200 dark:border-white/10 max-w-3xl mx-auto w-full">
            {documents.map((doc) => (
                <button
                    key={doc.id}
                    onClick={() => onView(doc.id)}
                    title="Click to view this document"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-cream-100 dark:bg-navy-800 text-gray-600 dark:text-cream-100/60 hover:bg-cream-200 dark:hover:bg-navy-700 transition-colors"
                >
                    <FileText size={12} />
                    <span className="max-w-[160px] truncate">
                        {doc.title || doc.filePath?.split(/[\\/]/).pop() || "Document"}
                    </span>
                </button>
            ))}
        </div>
    );
}
