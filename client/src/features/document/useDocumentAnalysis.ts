import { useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import { apiErrorMessage } from "../../services/apiError";

export function useDocumentAnalysis() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const runAnalysis = async (documentId: number) => {
    setSelectedId(documentId);
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const res = await API.post("/analysis/run", { documentId });
      setAnalysis(res.data.data.analysis);

      // A fresh (non-cached) run updates the document's title/type/status —
      // refresh the list so the sidebar reflects it without a manual reload.
      if (!res.data.data.cached) {
        bumpRefresh();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "We couldn't analyze this document. Please try again."));
    } finally {
      setAnalyzing(false);
    }
  };

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleUploaded = (documentId: number) => {
    bumpRefresh();
    runAnalysis(documentId);
  };

  // Used when the open document is deleted, so its report doesn't linger.
  const clearSelection = () => {
    setSelectedId(null);
    setAnalysis(null);
    setAnalyzing(false);
  };

  return {
    clearSelection,
    selectedId,
    analysis,
    analyzing,
    refreshKey,
    runAnalysis,
    bumpRefresh,
    handleUploaded,
  };
}
