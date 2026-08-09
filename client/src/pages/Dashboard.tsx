import Sidebar from "../components/layout/Sidebar";
import UploadPanel from "../features/document/UploadPanel";
import { useState } from "react";
import API from "../services/api";
import DocumentList from "./DocumentList";
import ResultPanel from "./ResultPanel";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

export default function Dashboard() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const user = useSelector((state: any) => state.auth.user);

  const runAnalysis = async (documentId: number) => {
    setSelectedId(documentId);
    setAnalyzing(true);
    setResult(null);

    try {
      const res = await API.post("/analysis/run", { documentId });
      setResult(res.data.data.ai);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUploaded = (documentId: number) => {
    setRefreshKey((k) => k + 1);
    runAnalysis(documentId);
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* 🔹 Top Bar */}
        <div className="flex justify-end items-center p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
              {userInitial}
            </div>

            {/* Name */}
            <div className="text-sm">
              <p className="font-semibold">{user?.name || "User"}</p>
              <p className="text-gray-400 text-xs">Welcome back</p>
            </div>
          </div>
        </div>

        {/* 🔹 Main Content */}
        <div className="flex-1 p-6 grid grid-cols-2 gap-6">
          <div>
            <UploadPanel onUploaded={handleUploaded} disabled={analyzing} />
            <DocumentList
              refreshKey={refreshKey}
              selectedId={selectedId}
              onSelect={(doc: any) => runAnalysis(doc.id)}
            />
          </div>

          <ResultPanel result={result} analyzing={analyzing} />
        </div>
      </div>
    </div>
  );
}
