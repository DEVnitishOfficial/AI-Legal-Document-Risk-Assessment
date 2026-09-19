import { useEffect, useRef } from "react";
import { MousePointerClick, ShieldAlert, FilePlus2 } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import PageIntro from "../components/layout/PageIntro";
import DocumentGrid from "../features/document/DocumentGrid";
import ResultPanel from "./ResultPanel";
import { useDocumentAnalysis } from "../features/document/useDocumentAnalysis";

export default function DocumentsPage() {
  const { selectedId, analysis, analyzing, refreshKey, runAnalysis } =
    useDocumentAnalysis();

  const reportRef = useRef<HTMLDivElement>(null);

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
            title="Every document you've analyzed"
            description="This is your library. Each analyzed document is saved here as a card with its risk verdict, so you can come back to a lease, notice or contract without uploading it again."
            points={[
              { icon: ShieldAlert, title: "Spot risk at a glance", text: "The colored chip on each card shows High, Medium or Low risk." },
              { icon: MousePointerClick, title: "Open any card", text: "Click a document and its full report opens right below the cards." },
              { icon: FilePlus2, title: "Add more", text: "New documents are uploaded from the Dashboard and appear here automatically." },
            ]}
          />

          <div className="p-6 space-y-6">
            <DocumentGrid
              refreshKey={refreshKey}
              selectedId={selectedId}
              onSelect={(doc: any) => runAnalysis(doc.id)}
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
