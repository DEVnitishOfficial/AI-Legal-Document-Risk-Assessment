import { useRef, useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import { apiErrorMessage } from "../../services/apiError";

// Analysis now runs in the background (BullMQ on the server — see
// server/src/modules/analysis/analysis.worker.ts), so /analysis/run
// answers immediately with { status: "queued" } instead of waiting for the
// AI call itself. This hook polls the same endpoint until the result (or a
// failure) is ready.
const POLL_INTERVAL_MS = 2000;
// ~4 minutes of polling — generous enough to cover OCR on a long scanned
// document plus the AI call, without polling forever if something is stuck.
const MAX_POLL_ATTEMPTS = 120;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useDocumentAnalysis() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Bumped on every runAnalysis call so a newer call's poll loop can tell an
  // older, still-in-flight one (e.g. after the user clicked a different
  // document) to stop applying its results.
  const runToken = useRef(0);

  const runAnalysis = async (documentId: number) => {
    const myToken = ++runToken.current;
    setSelectedId(documentId);
    setAnalyzing(true);
    setAnalysis(null);

    // Tracks whether this run actually had to wait on the background job —
    // as opposed to the document already being analyzed before this call —
    // so the document list is only refreshed when there's something new to
    // show (a freshly AI-generated title/type), not on every open of an
    // already-analyzed document.
    let hadToWait = false;

    try {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        if (runToken.current !== myToken) return; // superseded by a newer call

        const res = await API.post("/analysis/run", {
          documentId,
          // Only the first call of this run asks for a retry of a
          // previously-failed analysis — later poll iterations must not,
          // or a document that can never succeed would be silently
          // re-attempted forever instead of surfacing the failure.
          retry: attempt === 0,
        });
        const data = res.data.data;

        if (runToken.current !== myToken) return;

        if (data.analysis) {
          setAnalysis(data.analysis);
          if (hadToWait) bumpRefresh();
          return;
        }

        if (data.failed) {
          toast.error(data.message || "We couldn't analyze this document. Please try again.");
          return;
        }

        // First time we learn this run is genuinely queued (not already
        // cached) — refresh the list once so its card picks up the
        // "Analyzing…" chip promptly instead of sitting on a stale
        // "Not analyzed yet" until the whole run finishes.
        if (!hadToWait) bumpRefresh();
        hadToWait = true;
        await sleep(POLL_INTERVAL_MS);
      }

      if (runToken.current === myToken) {
        toast.error("This is taking longer than expected. Please try again in a moment.");
      }
    } catch (err) {
      if (runToken.current === myToken) {
        toast.error(apiErrorMessage(err, "We couldn't analyze this document. Please try again."));
      }
    } finally {
      if (runToken.current === myToken) setAnalyzing(false);
    }
  };

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleUploaded = (documentId: number) => {
    bumpRefresh();
    runAnalysis(documentId);
  };

  // Used when the open document is deleted, so its report doesn't linger.
  const clearSelection = () => {
    runToken.current += 1; // stop any in-flight poll loop from resurrecting it
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
