import { useState } from "react";
import { X } from "lucide-react";
import API from "../../services/api";
import FormError from "../../components/ui/FormError";
import { apiErrorMessage } from "../../services/apiError";

interface AttachDocumentModalProps {
    onClose: () => void;
    onAttached: (documentId: number) => void;
}

export default function AttachDocumentModal({ onClose, onAttached }: AttachDocumentModalProps) {
    const [mode, setMode] = useState<"file" | "text">("file");
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (mode === "file" && !file) {
            setError("Please choose a file to attach first.");
            return;
        }
        if (mode === "text" && text.trim().length < 50) {
            setError("Please paste at least 50 characters so there is enough text to work with.");
            return;
        }

        setError(null);
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
        } catch (err) {
            setError(apiErrorMessage(err, "We couldn't attach your document. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-navy-900 border border-cream-200 dark:border-white/10 rounded-xl p-6 w-full max-w-md text-navy-950 dark:text-cream-50"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-display font-medium">Attach a document</h3>
                    <button onClick={onClose} className="text-gray-400 dark:text-cream-100/50 hover:text-navy-950 dark:hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setMode("file")}
                        className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${
                            mode === "file"
                                ? "bg-navy-900 text-cream-50 dark:bg-gold-500 dark:text-navy-950"
                                : "bg-cream-100 text-gray-500 dark:bg-navy-800 dark:text-cream-100/50"
                        }`}
                    >
                        Upload File
                    </button>
                    <button
                        onClick={() => setMode("text")}
                        className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${
                            mode === "text"
                                ? "bg-navy-900 text-cream-50 dark:bg-gold-500 dark:text-navy-950"
                                : "bg-cream-100 text-gray-500 dark:bg-navy-800 dark:text-cream-100/50"
                        }`}
                    >
                        Paste Text
                    </button>
                </div>

                {mode === "file" ? (
                    <label className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-cream-200 dark:border-white/15 px-4 py-4 text-sm cursor-pointer hover:border-gold-500/60 transition-colors">
                        <input
                            type="file"
                            disabled={loading}
                            onChange={(e) => {
                                setFile(e.target.files?.[0] || null);
                                setError(null);
                            }}
                            className="hidden"
                        />
                        <span className="text-gray-500 dark:text-cream-100/50 truncate">
                            {file ? file.name : "Choose a file…"}
                        </span>
                    </label>
                ) : (
                    <textarea
                        value={text}
                        disabled={loading}
                        onChange={(e) => {
                            setText(e.target.value);
                            setError(null);
                        }}
                        placeholder="Paste FIR text, agreement text, etc. (minimum 50 characters)"
                        className="w-full h-32 p-3 rounded-lg bg-cream-50 dark:bg-navy-950 border border-cream-200 dark:border-white/10 text-sm mb-4 focus:outline-none focus:border-gold-500"
                    />
                )}

                <FormError message={error} className="mb-4" />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-navy-900 hover:bg-navy-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-cream-50 dark:text-navy-950 font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                    {loading ? "Uploading..." : "Attach"}
                </button>
            </div>
        </div>
    );
}
