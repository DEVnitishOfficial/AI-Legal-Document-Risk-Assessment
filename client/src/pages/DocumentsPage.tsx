import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { UploadCloud, ScanSearch, FolderOpen } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import PageIntro from "../components/layout/PageIntro";
import UploadPanel from "../features/document/UploadPanel";
import DocumentGrid from "../features/document/DocumentGrid";
import ResultPanel from "./ResultPanel";
import { useDocumentAnalysis } from "../features/document/useDocumentAnalysis";

export default function DocumentsPage() {
  const { selectedId, analysis, analyzing, refreshKey, runAnalysis, handleUploaded, clearSelection } =
    useDocumentAnalysis();

  const [searchParams, setSearchParams] = useSearchParams();
  const reportRef = useRef<HTMLDivElement>(null);
  const openedFromLink = useRef(false);

  // Dashboard links here with ?doc=<id> to open that document's report.
  // Handled once, then the param is dropped so refresh/back don't re-trigger it.
  useEffect(() => {
    const docId = Number(searchParams.get("doc"));
    if (docId && !openedFromLink.current) {
      openedFromLink.current = true;
      runAnalysis(docId);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opening a card brings its report into view right below the grid.
  useEffect(() => {
    if (selectedId !== null) {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId]);

  return (
    <div className="flex h-screen bg-cream-50 dark:bg-navy-950 text-navy-950 dark:text-cream-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PageIntro
            storageKey="documents"
            eyebrow="Your case files"
            title="Upload, analyze and manage documents"
            description="This is where documents live. Add a lease, notice, FIR or contract and NyayMitra scores its risk and flags the clauses to watch. Every analyzed document stays here as a card you can reopen, rename, favorite or delete."
            points={[
              { icon: UploadCloud, title: "1. Add a document", text: "Upload a PDF or paste text (at least 50 characters) in the box below." },
              { icon: ScanSearch, title: "2. Read the report", text: "Its risk score, summary and flagged clauses open right below the cards." },
              { icon: FolderOpen, title: "3. Manage your files", text: "Use the star, pencil and bin on a card to favorite, rename or delete it." },
            ]}
          />

          <div className="p-6 space-y-6">
            <div className="max-w-2xl">
              <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-3">
                Add a document
              </h2>
              <UploadPanel onUploaded={handleUploaded} disabled={analyzing} />
            </div>

            <DocumentGrid
              refreshKey={refreshKey}
              selectedId={selectedId}
              onSelect={(doc: any) => runAnalysis(doc.id)}
              onDeleted={(id) => {
                if (id === selectedId) clearSelection();
              }}
            />

            <div ref={reportRef} className="scroll-mt-6">
              {selectedId !== null ? (
                <>
                  <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-gray-400 dark:text-cream-100/40 mb-3">
                    Analysis report
                  </h2>
                  <ResultPanel result={analysis} analyzing={analyzing} />
                </>
              ) : (
                <p className="text-center text-sm text-gray-400 dark:text-cream-100/40 py-6">
                  Select a document above to see its full analysis here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
