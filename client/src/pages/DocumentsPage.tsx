import Sidebar from "../components/layout/Sidebar";
import DocumentList from "./DocumentList";
import ResultPanel from "./ResultPanel";
import { useDocumentAnalysis } from "../features/document/useDocumentAnalysis";

export default function DocumentsPage() {
  const { selectedId, analysis, analyzing, refreshKey, runAnalysis } =
    useDocumentAnalysis();

  return (
    <div className="flex h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-semibold">Your Documents</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            Click a document to view its AI analysis report
          </p>
        </div>

        <div className="flex-1 min-h-0 p-6 grid grid-cols-2 gap-6">
          <div className="min-h-0 overflow-y-auto">
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
