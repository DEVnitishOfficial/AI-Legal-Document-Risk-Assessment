import { useState } from "react";
import API from "../../services/api";

export default function UploadPanel() {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    setLoading(true);
    try {
      if (mode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);

        await API.post("/documents/upload", formData);
      } else if (mode === "text") {
        await API.post("/documents/text", { content: text });
      }

      alert("Uploaded successfully 🚀");
    } catch (err) {
      alert("Upload failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl">
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode("file")}
          className={`px-4 py-2 rounded ${
            mode === "file" ? "bg-purple-600" : "bg-gray-800"
          }`}
        >
          Upload File
        </button>

        <button
          onClick={() => setMode("text")}
          className={`px-4 py-2 rounded ${
            mode === "text" ? "bg-purple-600" : "bg-gray-800"
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
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

      {/* TEXT MODE */}
      {mode === "text" && (
        <textarea
          placeholder="Paste your terms and conditions here..."
          className="w-full h-40 p-3 rounded bg-gray-800 mb-4"
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {/* ACTION */}
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-purple-600 px-6 py-2 rounded"
      >
        {loading ? "Processing..." : "Submit"}
      </button>
    </div>
  );
}