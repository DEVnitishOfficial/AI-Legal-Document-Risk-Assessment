import { useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";

interface UploadPanelProps {
  onUploaded: (documentId: number) => void;
  disabled?: boolean;
}

export default function UploadPanel({ onUploaded, disabled }: UploadPanelProps) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
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
        setFile(null);
      } else {
        const res = await API.post("/documents/text", { content: text });
        documentId = res.data.data.document.id;
        setText("");
      }

      toast.success("Uploaded successfully 🚀");
      onUploaded(documentId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 dark:bg-gray-900 dark:border-transparent p-6 rounded-xl text-gray-900 dark:text-white">
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode("file")}
          className={`px-4 py-2 rounded ${
            mode === "file"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          Upload File
        </button>

        <button
          onClick={() => setMode("text")}
          className={`px-4 py-2 rounded ${
            mode === "text"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          Paste Text
        </button>
      </div>

      {/* FILE MODE */}
      {mode === "file" && (
        <div>
          <input
            type="file"
            className="mb-4"
            disabled={loading || disabled}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

      {/* TEXT MODE */}
      {mode === "text" && (
        <textarea
          value={text}
          placeholder="Paste your terms and conditions here... (minimum 50 characters)"
          className="w-full h-40 p-3 rounded bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white mb-4"
          disabled={loading || disabled}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {/* ACTION */}
      <button
        onClick={handleUpload}
        disabled={loading || disabled}
        className="bg-purple-600 px-6 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Uploading..." : disabled ? "Analyzing..." : "Submit"}
      </button>
    </div>
  );
}
