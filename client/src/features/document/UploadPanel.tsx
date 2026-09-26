import { useState } from "react";
import { UploadCloud, FileCheck2 } from "lucide-react";
import API from "../../services/api";
import toast from "react-hot-toast";
import FormError from "../../components/ui/FormError";
import { apiErrorMessage } from "../../services/apiError";

interface UploadPanelProps {
  onUploaded: (documentId: number) => void;
  disabled?: boolean;
}

export default function UploadPanel({ onUploaded, disabled }: UploadPanelProps) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (mode === "file" && !file) {
      setError("Please choose a file to upload first.");
      return;
    }

    if (mode === "text" && text.trim().length < 50) {
      setError("Please paste at least 50 characters so there is enough text to analyze.");
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
        setFile(null);
      } else {
        const res = await API.post("/documents/text", { content: text });
        documentId = res.data.data.document.id;
        setText("");
      }

      toast.success("Uploaded successfully 🚀");
      onUploaded(documentId);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't upload your document. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-cream-200 dark:bg-navy-900 dark:border-white/10 p-5 rounded-xl text-navy-950 dark:text-cream-50 mb-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
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

      {/* FILE MODE */}
      {mode === "file" && (
        <label
          className={`mb-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-7 text-center cursor-pointer transition-colors
            ${file ? "border-gold-500 bg-gold-500/5" : "border-cream-200 dark:border-white/15 hover:border-gold-500/60"}
            ${loading || disabled ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            type="file"
            className="hidden"
            disabled={loading || disabled}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError(null);
            }}
          />
          {file ? (
            <>
              <FileCheck2 size={20} className="text-gold-600 dark:text-gold-400" />
              <span className="text-[13px] font-semibold">{file.name}</span>
              <span className="text-[11.5px] text-gray-400 dark:text-cream-100/40">Click to choose a different file</span>
            </>
          ) : (
            <>
              <UploadCloud size={20} className="text-gray-400 dark:text-cream-100/40" />
              <span className="text-[13px] font-semibold">Drop a file, or click to browse</span>
              <span className="text-[11.5px] text-gray-400 dark:text-cream-100/40">PDF, up to 10MB</span>
            </>
          )}
        </label>
      )}

      {/* TEXT MODE */}
      {mode === "text" && (
        <textarea
          value={text}
          placeholder="Paste your terms and conditions here... (minimum 50 characters)"
          className="w-full h-32 p-3 rounded-lg bg-cream-50 border border-cream-200 dark:bg-navy-950 dark:border-white/10 text-navy-950 dark:text-cream-50 mb-4 text-[13.5px] focus:outline-none focus:border-gold-500"
          disabled={loading || disabled}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />
      )}

      <FormError message={error} className="mb-4" />

      {/* ACTION */}
      <button
        onClick={handleUpload}
        disabled={loading || disabled}
        className="w-full bg-navy-900 hover:bg-navy-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-cream-50 dark:text-navy-950 font-semibold px-6 py-2.5 rounded-lg text-[13.5px] transition-colors disabled:opacity-50"
      >
        {loading ? "Uploading..." : disabled ? "Analyzing..." : "Analyze document"}
      </button>
    </div>
  );
}
