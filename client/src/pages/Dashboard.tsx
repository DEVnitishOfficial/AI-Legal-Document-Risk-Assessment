import { UploadCloud, ScanSearch, FolderOpen } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import PageIntro from "../components/layout/PageIntro";
import UploadPanel from "../features/document/UploadPanel";
import DocumentList from "./DocumentList";
import ResultPanel from "./ResultPanel";
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

  return (
    <div className="flex h-screen bg-cream-50 dark:bg-navy-950 text-navy-950 dark:text-cream-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <PageIntro
          storageKey="dashboard"
          eyebrow="Case workspace"
          title="Analyze a legal document"
          description="Start here. Upload a lease, notice, FIR or contract — or paste its text — and NyayMitra reads every clause, scores the risk, and explains in plain language what to watch out for."
          points={[
            { icon: UploadCloud, title: "1. Add a document", text: "Upload a PDF or paste text (at least 50 characters) on the left." },
            { icon: ScanSearch, title: "2. Read the report", text: "The risk score, summary and flagged clauses appear on the right in a few seconds." },
            { icon: FolderOpen, title: "3. Find it later", text: "Every analysis is saved — reopen it any time from Documents." },
          ]}
        />

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
