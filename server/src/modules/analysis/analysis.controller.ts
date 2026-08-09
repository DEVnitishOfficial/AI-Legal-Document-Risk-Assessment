import { Response, NextFunction } from "express";
import { analyzeDocument } from "./analysis.service";
import { createAnalysis, getDocumentById } from "./analysis.repository";
import { extractTextFromPDF } from "../../common/utils/pdf";
import { AppError } from "../../common/errors/AppError";

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

        let text = "";

        if (doc.filePath) {
            text = await extractTextFromPDF(doc.filePath);
        } else if (doc.content) {
            text = doc.content;
        } else {
            throw new AppError("No valid content found in this document", 400);
        }

        const aiResult = await analyzeDocument(text);

        const saved = await createAnalysis(
            documentId,
            aiResult.summary,
            aiResult.riskLevel
        );

        res.json({
            success: true,
            data: {
                analysis: saved,
                ai: aiResult,
            },
        });
    } catch (err) {
        console.error("Error occurred while running analysis:", err);
        next(err);
    }
};