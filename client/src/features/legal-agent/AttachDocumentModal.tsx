import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../services/api";

interface AttachDocumentModalProps {
    onClose: () => void;
    onAttached: (documentId: number) => void;
}

export default function AttachDocumentModal({ onClose, onAttached }: AttachDocumentModalProps) {
    const [mode, setMode] = useState<"file" | "text">("file");
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (mode === "file" && !file) {
            toast.error("Please choose a file first");
            return;
        }
        if (mode === "text" && text.trim().length < 50) {
            toast.error("Please paste at least 50 characters");
            return;
        }

        setLoading(true);
        try {
            let documentId: number;

            if (mode === "file") {
                const formData = new FormData();
                formData.append("file", file as File);
                const res = await API.post("/documents/upload", formData);
                documentId = res.data.data.document.id;
            } else {
                const res = await API.post("/documents/text", { content: text });
                documentId = res.data.data.document.id;
            }

            onAttached(documentId);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md text-gray-900 dark:text-white"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Attach a document</h3>
                    <button onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="flex gap-3 mb-4">
                    <button
                        onClick={() => setMode("file")}
                        className={`px-3 py-1.5 rounded text-sm ${
                            mode === "file"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                    >
                        Upload File
                    </button>
                    <button
                        onClick={() => setMode("text")}
                        className={`px-3 py-1.5 rounded text-sm ${
                            mode === "text"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                    >
                        Paste Text
                    </button>
                </div>

                {mode === "file" ? (
                    <input
                        type="file"
                        disabled={loading}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="mb-4 text-sm"
                    />
                ) : (
                    <textarea
                        value={text}
                        disabled={loading}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste FIR text, agreement text, etc. (minimum 50 characters)"
                        className="w-full h-32 p-3 rounded bg-gray-100 dark:bg-gray-800 text-sm mb-4"
                    />
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-2 rounded disabled:opacity-50"
                >
                    {loading ? "Uploading..." : "Attach"}
                </button>
            </div>
        </div>
    );
}
