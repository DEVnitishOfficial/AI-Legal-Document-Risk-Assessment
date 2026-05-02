import { Request, Response, NextFunction } from "express";
import { analyzeDocument } from "./analysis.service";
import { createAnalysis, getDocumentById } from "./analysis.repository";
import { extractTextFromPDF } from "../../common/utils/pdf";

export const runAnalysis = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { documentId, filePath } = req.body;

          const doc = await getDocumentById(documentId);

        if (!doc) {
            throw new Error("Document not found");
        }

        let text = "";

        if (doc.filePath) {
            text = await extractTextFromPDF(doc.filePath);
        } else if (doc.content) {
            text = doc.content;
        } else {
            throw new Error("No valid content");
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