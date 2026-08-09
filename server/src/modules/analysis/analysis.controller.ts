import { Response, NextFunction } from "express";
import { analyzeDocument } from "./analysis.service";
import { createAnalysis, getDocumentById } from "./analysis.repository";
import { markDocumentAnalyzed, markDocumentFailed } from "../document/document.repository";
import { extractTextFromPDF } from "../../common/utils/pdf";
import { AppError } from "../../common/errors/AppError";

const RISK_SCORE_BY_LEVEL: Record<string, number> = {
    Low: 30,
    Medium: 60,
    High: 90,
};

export const runAnalysis = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { documentId } = req.body;

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
        // another OpenAI call on a document we've already processed.
        if (doc.analysis) {
            return res.json({
                success: true,
                data: { analysis: doc.analysis, cached: true },
            });
        }

        let text = "";

        if (doc.filePath) {
            text = await extractTextFromPDF(doc.filePath);
        } else if (doc.content) {
            text = doc.content;
        } else {
            throw new AppError("No valid content found in this document", 400);
        }

        try {
            const aiResult = await analyzeDocument(text);

            const saved = await createAnalysis(documentId, {
                summary: aiResult.summary,
                riskLevel: aiResult.riskLevel,
                riskScore: RISK_SCORE_BY_LEVEL[aiResult.riskLevel] ?? 60,
                clauses: aiResult.clauses,
                riskItems: aiResult.riskItems,
            });

            await markDocumentAnalyzed(documentId, aiResult.title, aiResult.documentType);

            res.json({
                success: true,
                data: { analysis: saved, cached: false },
            });
        } catch (aiError) {
            await markDocumentFailed(documentId);
            throw aiError;
        }
    } catch (err) {
        console.error("Error occurred while running analysis:", err);
        next(err);
    }
};
