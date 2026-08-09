import Sidebar from "../components/layout/Sidebar";
import UploadPanel from "../features/document/UploadPanel";
import DocumentList from "./DocumentList";
import ResultPanel from "./ResultPanel";
import { useSelector } from "react-redux";
import { useDocumentAnalysis } from "../features/document/useDocumentAnalysis";

export default function Dashboard() {
  const {
    selectedId,
    analysis,
    analyzing,
    refreshKey,
    runAnalysis,
    handleUploaded,
  } = useDocumentAnalysis();

  const user = useSelector((state: any) => state.auth.user);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* 🔹 Top Bar */}
        <div className="flex justify-end items-center p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
              {userInitial}
            </div>

            {/* Name */}
            <div className="text-sm">
              <p className="font-semibold">{user?.name || "User"}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Welcome back</p>
            </div>
          </div>
        </div>

        {/* 🔹 Main Content */}
        <div className="flex-1 min-h-0 p-6 grid grid-cols-2 gap-6">
          <div className="min-h-0 overflow-y-auto">
            <UploadPanel onUploaded={handleUploaded} disabled={analyzing} />
            <DocumentList
              refreshKey={refreshKey}
              selectedId={selectedId}
              onSelect={(doc: any) => runAnalysis(doc.id)}
            />
          </div>

          <div className="min-h-0">
            <ResultPanel result={analysis} analyzing={analyzing} />
          </div>
        </div>
      </div>
    </div>
  );
}
