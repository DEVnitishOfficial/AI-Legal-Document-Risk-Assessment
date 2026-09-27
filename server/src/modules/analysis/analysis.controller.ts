import { Response, NextFunction } from "express";
import { getDocumentById } from "./analysis.repository";
import { markDocumentProcessing } from "../document/document.repository";
import { enqueueAnalysis } from "./analysis.queue";
import { AppError } from "../../common/errors/AppError";

// Re-exported for backward compatibility — the derivation itself now lives
// in analysis.riskScore.ts (see that file for why).
export { riskScoreForLevel } from "./analysis.riskScore";

// The actual analysis (text extraction, OCR fallback, the OpenAI call) runs
// in the background via BullMQ (see analysis.worker.ts) — this handler's
// job is just to report where things stand and, if nothing is in flight
// yet, kick a job off. It is deliberately safe to call repeatedly: the
// client polls this same endpoint while a document is "processing".
export const runAnalysis = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { documentId, retry } = req.body;

        if (!documentId) {
            throw new AppError("documentId is required", 400);
        }

        const doc = await getDocumentById(documentId);

        if (!doc) {
            throw new AppError("Document not found", 404);
        }

        if (doc.userId !== req.user?.id) {
            throw new AppError("Not authorized to access this document", 403);
        }

        // Already analyzed — return the stored result instead of spending
        // another OpenAI call (or another background job) on a document
        // we've already processed.
        if (doc.analysis) {
            return res.json({
                success: true,
                data: { analysis: doc.analysis, cached: true },
            });
        }

        // A job is already queued/running for this document — just report
        // that, rather than enqueueing a second one (the queue itself also
        // guards against this via a deterministic jobId, but checking here
        // avoids the extra round trip).
        if (doc.status === "processing") {
            return res.status(202).json({ success: true, data: { status: "queued" } });
        }

        // A previous run failed for good (all retries exhausted). Only
        // start a new attempt when the client explicitly asks for a retry
        // (the first call of a fresh "analyze" click) — not on every poll,
        // or a document that can never succeed would be silently
        // re-attempted forever instead of surfacing the failure.
        if (doc.status === "failed" && !retry) {
            return res.json({
                success: true,
                data: { failed: true, message: "Analysis failed. Please try again." },
            });
        }

        await markDocumentProcessing(documentId);
        await enqueueAnalysis(documentId);

        return res.status(202).json({ success: true, data: { status: "queued" } });
    } catch (err) {
        console.error("Error occurred while running analysis:", err);
        next(err);
    }
};
