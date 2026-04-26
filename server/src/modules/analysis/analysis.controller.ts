import { Request, Response, NextFunction } from "express";
import { analyzeDocument } from "./analysis.service";
import { createAnalysis } from "./analysis.repository";
import { extractTextFromPDF } from "../../common/utils/pdf";

export const runAnalysis = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { documentId, filePath } = req.body;

        // Extract text again (or store earlier later)
        const text = await extractTextFromPDF(filePath);

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