import { prisma } from "../../config/db";

export const createAnalysis = async (
    documentId: number,
    summary: string,
    riskLevel: string
) => {
    // A document can only have one analysis (documentId is unique), so
    // re-running analysis on an already-analyzed document must overwrite
    // the existing row instead of colliding with the unique constraint.
    return prisma.analysis.upsert({
        where: { documentId },
        update: { summary, riskLevel },
        create: { documentId, summary, riskLevel },
    });
};

export const getDocumentById = async (documentId: number) => {
    return prisma.document.findUnique({ where: { id: documentId } });
};