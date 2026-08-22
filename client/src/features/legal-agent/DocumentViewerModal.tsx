import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../services/api";
import type { AttachedDocument } from "./types";

interface DocumentViewerModalProps {
    documentId: number;
    onClose: () => void;
}

export default function DocumentViewerModal({ documentId, onClose }: DocumentViewerModalProps) {
    const [loading, setLoading] = useState(true);
    const [doc, setDoc] = useState<AttachedDocument | null>(null);
    const [textContent, setTextContent] = useState("");
    const [fileUrl, setFileUrl] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;

        const load = async () => {
            setLoading(true);
            try {
                const metaRes = await API.get(`/documents/${documentId}`);
                const { document, content } = metaRes.data.data;
                setDoc(document);

                if (document.filePath) {
                    // Fetched as a blob (not a raw <iframe src>) so the
                    // Authorization header attaches automatically via the
                    // shared axios instance, same reasoning as message audio
                    // playback — avoids putting the JWT in a URL.
                    const fileRes = await API.get(`/documents/${documentId}/file`, {
                        responseType: "blob",
                    });
                    objectUrl = URL.createObjectURL(fileRes.data);
                    setFileUrl(objectUrl);
                } else {
                    setTextContent(content || "");
                }
            } catch (err: any) {
                toast.error(err?.response?.data?.message || "Failed to load document");
                onClose();
            } finally {
                setLoading(false);
            }
        };

        load();

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col text-gray-900 dark:text-white overflow-hidden"
            >
                <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <h3 className="font-semibold truncate pr-4">
                        {doc?.title || doc?.filePath?.split(/[\\/]/).pop() || "Document"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    ) : fileUrl ? (
                        <iframe src={fileUrl} title="Document preview" className="w-full h-full border-0" />
                    ) : (
                        <pre className="h-full overflow-y-auto p-5 text-sm whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
                            {textContent}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
}
